import { GoogleGenerativeAI } from "@google/generative-ai";
import { settingsStorageService } from "./settingsStorage";

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: Date;
}

export interface DetectedAlias {
  nickname: string;
  expansion: string;
}

export interface ParsedFoodResponse {
  foodItem: FoodItem;
  foodItems?: FoodItem[];
  detectedAlias?: DetectedAlias;
  aliasOnly?: boolean;
}

export interface Alias {
  nickname: string;
  expansion: string;
}

export interface RelevantPastFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

export interface FoodImageInput {
  mimeType: string;
  data: string;
}

class GeminiService {
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;
  private apiKey = "";

  private getModel() {
    const apiKey = settingsStorageService.getApiKey();

    if (!this.model || this.apiKey !== apiKey) {
      if (!apiKey) {
        throw new Error(
          "Add your Gemini API key in Settings before logging food.",
        );
      }

      this.apiKey = apiKey;
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
      });
    }

    return this.model;
  }

  resetModel() {
    this.client = null;
    this.model = null;
    this.apiKey = "";
  }

  private buildSystemPrompt(
    aliases: Alias[],
    relevantPastFoods: RelevantPastFood[],
  ): string {
    let prompt = `You are a nutrition data extraction AI. The user will describe food they've eaten.
Your task is to:
1. Extract one or more food items and their amounts
2. Estimate the nutritional values: calories, protein (g), carbs (g), fat (g)
3. Return a JSON object with these exact fields: name, calories, protein, carbs, fat
4. Detect if the user is creating a food alias (phrases like "remember that...", "in the future...", "note that...")
5. If the input is unclear, ask for clarification instead of guessing zeros

Available user-defined aliases (use these to interpret food descriptions):`;

    if (aliases.length > 0) {
      aliases.forEach((alias) => {
        prompt += `\n- "${alias.nickname}" = "${alias.expansion}"`;
      });
    } else {
      prompt += "\n(No aliases defined yet)";
    }

    prompt += `

Relevant past foods from this user (use these as strong hints when the current entry appears to be the same or very similar food):`;

    if (relevantPastFoods.length > 0) {
      relevantPastFoods.forEach((food) => {
        prompt += `\n- "${food.name}" -> ${food.calories} cal, ${food.protein}g protein, ${food.carbs}g carbs, ${food.fat}g fat (logged ${food.timestamp})`;
      });
    } else {
      prompt += "\n(No relevant past foods found)";
    }

    prompt += `

IMPORTANT RULES:
- Use the aliases when the user mentions them
- Prefer matching the user's own past food values when the current food appears to be the same item or a very close variant
- If user creates an alias, detect it and extract the nickname and expansion
- If you are unsure what the food/amount is, set "needsClarification" to true and provide a concise "clarificationQuestion"
- Do NOT return all zero nutrition values unless the user explicitly entered a true zero-calorie item
- If the user input contains multiple foods (example: "300g tofu 600g rice"), split into separate entries in an "items" array
- Always return a JSON object in this format:
{
  "name": "food name and amount",
  "calories": 200,
  "protein": 10,
  "carbs": 25,
  "fat": 8,
  "items": [
    {
      "name": "food name and amount",
      "calories": 200,
      "protein": 10,
      "carbs": 25,
      "fat": 8
    }
  ],
  "detectedAlias": null,
  "needsClarification": false,
  "clarificationQuestion": null,
  "explanation": null
}
- If there is only one food item, you can provide a single entry in "items" or leave it null
- If an alias is detected, include it:
{
  "detectedAlias": {
    "nickname": "splash of milk",
    "expansion": "40g soymilk"
  }
}
- If clarification is needed, respond like:
{
  "name": "",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "detectedAlias": null,
  "needsClarification": true,
  "clarificationQuestion": "Can you share the amount and preparation (for example grilled, fried, or with sauce)?",
  "explanation": "Not enough detail to estimate accurately."
}
- Focus on accuracy for the detected alias, the rest of the food data should be accurate

Return ONLY valid JSON, no other text.`;

    return prompt;
  }

  async parseFoodInput(
    userText: string,
    aliases: Alias[] = [],
    relevantPastFoods: RelevantPastFood[] = [],
    imageInput?: FoodImageInput,
  ): Promise<ParsedFoodResponse> {
    if (!userText.trim() && !imageInput) {
      throw new Error("Please enter text or take a photo");
    }

    try {
      const model = this.getModel();
      const systemPrompt = this.buildSystemPrompt(aliases, relevantPastFoods);

      const parts: any[] = [
        {
          text: systemPrompt,
        },
        {
          text: userText.trim()
            ? `Parse this food entry: "${userText}"`
            : "Parse this food from the image and estimate calories, protein, carbs, and fat.",
        },
      ];

      if (imageInput) {
        parts.push({
          inlineData: {
            mimeType: imageInput.mimeType,
            data: imageInput.data,
          },
        });
      }

      const response = await model.generateContent({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      });

      const responseText =
        response.response.candidates?.[0]?.content?.parts?.[0]?.text ||
        response.response.text();
      if (!responseText) {
        throw new Error("No response from Gemini API");
      }

      // Extract JSON from response (handle cases where model wraps it in markdown)
      let jsonStr = responseText;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);

      if (parsed.needsClarification) {
        if (parsed.detectedAlias) {
          return {
            foodItem: {
              name: "Alias definition",
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              timestamp: new Date(),
            },
            foodItems: [],
            detectedAlias: {
              nickname: parsed.detectedAlias.nickname.toLowerCase().trim(),
              expansion: parsed.detectedAlias.expansion.trim(),
            },
            aliasOnly: true,
          };
        }

        throw new Error(
          parsed.clarificationQuestion ||
            parsed.explanation ||
            "I need a bit more detail to estimate nutrition accurately. Can you provide amount and preparation?",
        );
      }

      const normalizedItems: FoodItem[] = Array.isArray(parsed.items)
        ? parsed.items.map((item: any) => ({
            name: item.name || "Unknown Food",
            calories: Math.max(0, Math.round(item.calories || 0)),
            protein: Math.max(0, Math.round((item.protein || 0) * 10) / 10),
            carbs: Math.max(0, Math.round((item.carbs || 0) * 10) / 10),
            fat: Math.max(0, Math.round((item.fat || 0) * 10) / 10),
            timestamp: new Date(),
          }))
        : [];

      if (normalizedItems.length === 0) {
        normalizedItems.push({
          name: parsed.name || "Unknown Food",
          calories: Math.max(0, Math.round(parsed.calories || 0)),
          protein: Math.max(0, Math.round((parsed.protein || 0) * 10) / 10),
          carbs: Math.max(0, Math.round((parsed.carbs || 0) * 10) / 10),
          fat: Math.max(0, Math.round((parsed.fat || 0) * 10) / 10),
          timestamp: new Date(),
        });
      }

      const allAreLikelyInvalidZero = normalizedItems.every(
        (item) =>
          item.calories === 0 &&
          item.protein === 0 &&
          item.carbs === 0 &&
          item.fat === 0,
      );

      if (allAreLikelyInvalidZero) {
        throw new Error(
          parsed.explanation ||
            "I couldn't confidently estimate that entry. Can you add amount and preparation details?",
        );
      }

      const result: ParsedFoodResponse = {
        foodItem: normalizedItems[0],
        foodItems: normalizedItems,
      };

      if (parsed.detectedAlias) {
        result.detectedAlias = {
          nickname: parsed.detectedAlias.nickname.toLowerCase().trim(),
          expansion: parsed.detectedAlias.expansion.trim(),
        };
      }

      return result;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("Failed to parse API response as JSON");
      }
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
