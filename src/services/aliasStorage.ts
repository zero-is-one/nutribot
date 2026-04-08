export interface Alias {
  nickname: string;
  expansion: string;
}

const ALIAS_STORAGE_KEY = "nutribot_aliases";

class AliasStorageService {
  private getAliases(): Alias[] {
    try {
      const data = localStorage.getItem(ALIAS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading aliases from localStorage:", error);
      return [];
    }
  }

  private saveAliases(aliases: Alias[]): void {
    try {
      localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(aliases));
    } catch (error) {
      console.error("Error writing aliases to localStorage:", error);
    }
  }

  saveAlias(nickname: string, expansion: string): Alias {
    const aliases = this.getAliases();
    const normalizedNickname = nickname.toLowerCase().trim();

    // Check if alias already exists and update it
    const existingIndex = aliases.findIndex(
      (a) => a.nickname.toLowerCase() === normalizedNickname,
    );

    const alias: Alias = {
      nickname: normalizedNickname,
      expansion: expansion.trim(),
    };

    if (existingIndex >= 0) {
      aliases[existingIndex] = alias;
    } else {
      aliases.push(alias);
    }

    this.saveAliases(aliases);
    return alias;
  }

  getAll(): Alias[] {
    return this.getAliases();
  }

  deleteAlias(nickname: string): void {
    const aliases = this.getAliases();
    const normalizedNickname = nickname.toLowerCase().trim();
    const filtered = aliases.filter(
      (a) => a.nickname.toLowerCase() !== normalizedNickname,
    );
    this.saveAliases(filtered);
  }

  getAliasesString(): string {
    const aliases = this.getAliases();
    if (aliases.length === 0) return "";

    return aliases.map((a) => `"${a.nickname}" = "${a.expansion}"`).join("\n");
  }
}

export const aliasStorageService = new AliasStorageService();
