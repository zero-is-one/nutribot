import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFoodLog } from "../context/FoodLogContext";
import { settingsStorageService } from "../services/settingsStorage";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  meta: () => [
    {
      title: "Settings",
    },
  ],
});

function SettingsPage() {
  const {
    apiKeyConfigured,
    aliases,
    saveApiKey,
    clearApiKey,
    deleteAlias,
    downloadHistory,
  } = useFoodLog();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setApiKeyInput(settingsStorageService.getApiKey());
  }, []);

  const handleSave = () => {
    saveApiKey(apiKeyInput);
    setSaveMessage("Gemini API key saved in this browser.");
  };

  const handleClear = () => {
    clearApiKey();
    setApiKeyInput("");
    setSaveMessage("Gemini API key removed from this browser.");
  };

  const handleExport = () => {
    downloadHistory();
    setSaveMessage("Nutrition history exported as JSON.");
  };

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-900 text-sea-ink dark:text-foam">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Link
            to="/tracker"
            className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Back to tracker"
            aria-label="Back to tracker"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your Gemini API key and exports.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <h2 className="text-base font-semibold">Gemini API Key</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              The key is stored only in this browser and used directly from the
              frontend.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                placeholder="Paste your Gemini API key"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--lagoon)] dark:border-slate-600 dark:bg-slate-800"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSave}
                  disabled={!apiKeyInput.trim()}
                  className="rounded-xl bg-[var(--lagoon)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save API Key
                </button>
                <button
                  onClick={handleClear}
                  disabled={!apiKeyConfigured && !apiKeyInput.trim()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  <Trash2 size={16} />
                  Clear Key
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Status: {apiKeyConfigured ? "Configured" : "Not configured"}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <h2 className="text-base font-semibold">Data Export</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Download your complete nutrition history and saved aliases as
              JSON.
            </p>
            <button
              onClick={handleExport}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              <Download size={16} />
              Export History
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <h2 className="text-base font-semibold">Food Aliases</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Aliases let you use shortcuts like "splash of milk" for a standard amount.
            </p>

            <div className="mt-4 space-y-2">
              {aliases.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No aliases saved yet.
                </p>
              ) : (
                aliases.map((alias) => (
                  <div
                    key={alias.nickname}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
                  >
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="truncate font-medium text-sea-ink dark:text-foam">
                        {alias.nickname}
                      </div>
                      <div className="truncate text-slate-500 dark:text-slate-400">
                        {alias.expansion}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAlias(alias.nickname)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {saveMessage ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {saveMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
