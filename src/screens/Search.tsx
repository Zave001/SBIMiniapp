import { useState } from "react";
import { useApi, useBackButton, useDebounced } from "../hooks";
import { navigate } from "../router";
import type { SearchResult } from "../types";
import { IconSearch } from "../components/Icons";
import { Card, Chip, Empty, Screen, Spinner } from "../components/ui";

export function Search() {
  useBackButton(true, "/");
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 350);
  const { data, loading } = useApi<{ results: SearchResult[] }>(q.length >= 2 ? `/search?q=${encodeURIComponent(q)}` : null);

  return (
    <Screen title="Поиск" subtitle="Дела, комментарии, заметки, задачи">
      <div className="search-field big">
        <IconSearch size={20} />
        <input autoFocus placeholder="Например: таблица лидов" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {q.length < 2 && <Empty emoji="🔎" text="Введите хотя бы 2 символа" />}
      {q.length >= 2 && loading && !data && <Spinner label="Ищу…" />}
      {q.length >= 2 && data && data.results.length === 0 && <Empty emoji="🤷" text={`По «${q}» ничего не нашлось`} />}
      {q.length >= 2 && data && data.results.length > 0 && (
        <div className="results">
          {data.results.map((r, i) => (
            <Card key={i} onClick={() => navigate(r.task_id ? `/tasks/${r.task_id}` : `/deals/${r.event.id}`)}>
              <div className="result-head">
                <Chip tone="accent">{r.kind_label}</Chip>
                <span className="hint small">{r.event.when}</span>
              </div>
              <b>{r.event.title}</b>
              {r.task_title && <p className="hint small">☐ {r.task_title}</p>}
              <p className="snippet"><Highlight text={r.snippet} query={q} /></p>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const lower = text.toLowerCase().replace(/ё/g, "е");
  const needle = query.toLowerCase().replace(/ё/g, "е");
  const at = lower.indexOf(needle);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}
