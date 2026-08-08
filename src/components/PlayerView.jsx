import { useState, useMemo, useEffect, useRef } from "react";
import { scoreCampaign } from "../utils/campaignSearch.js";
import { suggestClosest } from "../utils/search.js";

const GROUPS = [
  { type: "npcs", label: "NPCs" },
  { type: "pcs", label: "Party" },
  { type: "factions", label: "Factions" },
  { type: "locations", label: "Locations" },
  { type: "quests", label: "Quests" },
  { type: "sessions", label: "Sessions" },
];

const labelFor = (type, item) => {
  if (type === "quests") return item.title;
  if (type === "sessions") return item.title ? `Session ${item.sessionNumber}: ${item.title}` : `Session ${item.sessionNumber}`;
  return item.name;
};

/**
 * Full-screen, read-only, search-and-browse view of the whole campaign —
 * meant to be handed to the table (same screen as the DM) so players can
 * look things up themselves mid-session without touching the DM tools.
 * Quest clues marked unrevealed are held back; everything else is shown
 * as-is.
 */
export default function PlayerView({ campaign, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null); // { type, id }
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, onClose]);

  const scored = useMemo(() => scoreCampaign(campaign, query), [campaign, query]);
  const q = query.trim();
  const results = q ? scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score) : [];
  const suggestions = q && results.length === 0 ? suggestClosest(query, scored.map((r) => r.label)) : [];

  const groups = GROUPS.map((g) => ({
    ...g,
    items: campaign[g.type]
      .map((item) => ({ id: item.id, label: labelFor(g.type, item) }))
      .sort((a, b) => (a.label || "").localeCompare(b.label || "")),
  })).filter((g) => g.items.length > 0);

  const jump = (type, id) => setSelected({ type, id });

  const selectedEntity = selected ? campaign[selected.type]?.find((i) => i.id === selected.id) : null;

  return (
    <div className="cf-playerview">
      <div className="cf-playerview-header">
        <div className="cf-playerview-title">🎭 {campaign.name} — Player View</div>
        <button type="button" className="cf-btn cf-btn-ghost" onClick={onClose}>
          Close ✕
        </button>
      </div>
      <div className="cf-playerview-body">
        <div className="cf-playerview-list">
          <input
            ref={inputRef}
            className="cf-input cf-playerview-search"
            placeholder="Search NPCs, locations, quests…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {q ? (
            <div className="cf-playerview-results">
              {results.length === 0 ? (
                <div className="cf-playerview-empty">
                  No matches
                  {suggestions.length > 0 && (
                    <>
                      {" — did you mean "}
                      {suggestions.map((s, i) => (
                        <span key={s}>
                          {i > 0 && ", "}
                          <span className="cf-quick-search-suggestion" onClick={() => setQuery(s)}>
                            {s}
                          </span>
                        </span>
                      ))}
                      ?
                    </>
                  )}
                </div>
              ) : (
                results.map((r) => (
                  <button
                    type="button"
                    key={`${r.type}-${r.id}`}
                    className={`cf-playerview-item${selected?.type === r.type && selected?.id === r.id ? " cf-playerview-item-active" : ""}`}
                    onClick={() => jump(r.type, r.id)}
                  >
                    <span className="cf-quick-search-kind">{r.kind}</span> {r.label || "Untitled"}
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="cf-playerview-groups">
              {groups.length === 0 && <div className="cf-playerview-empty">Nothing in this campaign yet.</div>}
              {groups.map((g) => (
                <div key={g.type} className="cf-playerview-group">
                  <div className="cf-playerview-group-label">{g.label}</div>
                  {g.items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`cf-playerview-item${selected?.type === g.type && selected?.id === item.id ? " cf-playerview-item-active" : ""}`}
                      onClick={() => jump(g.type, item.id)}
                    >
                      {item.label || "Untitled"}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="cf-playerview-detail">
          {selectedEntity ? (
            <Detail type={selected.type} entity={selectedEntity} campaign={campaign} onJump={jump} />
          ) : (
            <div className="cf-playerview-placeholder">Search or browse to pull something up for the table.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ type, entity, campaign, onJump }) {
  if (type === "npcs") return <NpcDetail npc={entity} campaign={campaign} onJump={onJump} />;
  if (type === "locations") return <LocationDetail location={entity} campaign={campaign} onJump={onJump} />;
  if (type === "quests") return <QuestDetail quest={entity} campaign={campaign} onJump={onJump} />;
  if (type === "factions") return <FactionDetail faction={entity} campaign={campaign} onJump={onJump} />;
  if (type === "pcs") return <PcDetail pc={entity} campaign={campaign} onJump={onJump} />;
  if (type === "sessions") return <SessionDetail session={entity} campaign={campaign} onJump={onJump} />;
  return null;
}

function Field({ label, children }) {
  const empty =
    children === null ||
    children === undefined ||
    children === "" ||
    (Array.isArray(children) && children.filter(Boolean).length === 0);
  if (empty) return null;
  return (
    <div className="cf-pv-field">
      <div className="cf-pv-field-label">{label}</div>
      <div className="cf-pv-field-value">{children}</div>
    </div>
  );
}

function NameLink({ type, id, name, onJump }) {
  if (!id || !name) return null;
  return (
    <button type="button" className="cf-pv-link" onClick={() => onJump(type, id)}>
      {name}
    </button>
  );
}

function LinkList({ items, onJump }) {
  const valid = items.filter((i) => i.id && i.name);
  if (valid.length === 0) return null;
  return valid.map((i, idx) => (
    <span key={i.id}>
      {idx > 0 && ", "}
      <NameLink type={i.type} id={i.id} name={i.name} onJump={onJump} />
    </span>
  ));
}

function TagRow({ tags }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="cf-pv-tag-row">
      {tags.map((t) => (
        <span key={t} className="cf-pv-tag">
          {t}
        </span>
      ))}
    </div>
  );
}

const titleCase = (s) => (s ? s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");

function NpcDetail({ npc, campaign, onJump }) {
  const faction = campaign.factions.find((f) => f.id === npc.factionId);
  const location = campaign.locations.find((l) => l.id === npc.locationId);
  const quests = campaign.quests.filter((q) => q.giverId === npc.id || q.relatedNpcIds.includes(npc.id));
  const sessions = campaign.sessions.filter((s) => s.relatedNpcIds.includes(npc.id));
  const outgoing = (npc.relationships || [])
    .map((r) => ({ rel: r, other: campaign.npcs.find((n) => n.id === r.npcId) }))
    .filter((x) => x.other);
  const incoming = campaign.npcs
    .filter((other) => (other.relationships || []).some((r) => r.npcId === npc.id))
    .map((other) => ({ other, rel: other.relationships.find((r) => r.npcId === npc.id) }));
  const connectedPcs = campaign.pcs.filter((p) => (p.relationships || []).some((r) => r.npcId === npc.id));

  return (
    <>
      <h2 className="cf-playerview-detail-title">{npc.name || "Untitled"}</h2>
      <div className="cf-playerview-detail-meta">
        {npc.role && <span className="cf-badge">{npc.role}</span>}
        {npc.race && <span className="cf-badge cf-badge-muted">{npc.race}</span>}
        <span className="cf-badge">{titleCase(npc.disposition)}</span>
        {npc.status && npc.status !== "alive" && <span className="cf-badge">{titleCase(npc.status)}</span>}
      </div>
      <Field label="Faction">
        <NameLink type="factions" id={faction?.id} name={faction?.name} onJump={onJump} />
      </Field>
      <Field label="Location">
        <NameLink type="locations" id={location?.id} name={location?.name} onJump={onJump} />
      </Field>
      <Field label="Description">{npc.description}</Field>
      <Field label="Relationships">
        {[...outgoing, ...incoming].length > 0 && (
          <div className="cf-pv-list">
            {outgoing.map(({ rel, other }) => (
              <div key={rel.id}>
                {rel.label ? `${rel.label}: ` : ""}
                <NameLink type="npcs" id={other.id} name={other.name} onJump={onJump} />
              </div>
            ))}
            {incoming.map(({ other, rel }) => (
              <div key={other.id}>
                <NameLink type="npcs" id={other.id} name={other.name} onJump={onJump} />
                {rel?.label ? ` — ${rel.label}` : ""}
              </div>
            ))}
          </div>
        )}
      </Field>
      <Field label="Connected party members">
        <LinkList items={connectedPcs.map((p) => ({ type: "pcs", id: p.id, name: p.name }))} onJump={onJump} />
      </Field>
      <Field label="Quests">
        <LinkList items={quests.map((q) => ({ type: "quests", id: q.id, name: q.title }))} onJump={onJump} />
      </Field>
      <Field label="Sessions">
        <LinkList
          items={sessions.map((s) => ({
            type: "sessions",
            id: s.id,
            name: s.title ? `Session ${s.sessionNumber}: ${s.title}` : `Session ${s.sessionNumber}`,
          }))}
          onJump={onJump}
        />
      </Field>
      <Field label="Tags">
        <TagRow tags={npc.tags} />
      </Field>
    </>
  );
}

function LocationDetail({ location, campaign, onJump }) {
  const parent = campaign.locations.find((l) => l.id === location.parentId);
  const npcsHere = campaign.npcs.filter((n) => n.locationId === location.id);
  const questsHere = campaign.quests.filter((q) => q.locationId === location.id);
  const pcsFrom = campaign.pcs.filter((p) => p.hometownLocationId === location.id);
  const sessions = campaign.sessions.filter((s) => s.relatedLocationIds.includes(location.id));

  return (
    <>
      <h2 className="cf-playerview-detail-title">{location.name || "Untitled"}</h2>
      <div className="cf-playerview-detail-meta">
        <span className="cf-badge">{titleCase(location.type)}</span>
      </div>
      <Field label="Part of">
        <NameLink type="locations" id={parent?.id} name={parent?.name} onJump={onJump} />
      </Field>
      <Field label="Description">{location.description}</Field>
      <Field label="Found here">
        <LinkList items={npcsHere.map((n) => ({ type: "npcs", id: n.id, name: n.name }))} onJump={onJump} />
      </Field>
      <Field label="Quests here">
        <LinkList items={questsHere.map((q) => ({ type: "quests", id: q.id, name: q.title }))} onJump={onJump} />
      </Field>
      <Field label="Hometown of">
        <LinkList items={pcsFrom.map((p) => ({ type: "pcs", id: p.id, name: p.name }))} onJump={onJump} />
      </Field>
      <Field label="Sessions">
        <LinkList
          items={sessions.map((s) => ({
            type: "sessions",
            id: s.id,
            name: s.title ? `Session ${s.sessionNumber}: ${s.title}` : `Session ${s.sessionNumber}`,
          }))}
          onJump={onJump}
        />
      </Field>
      <Field label="Tags">
        <TagRow tags={location.tags} />
      </Field>
    </>
  );
}

function QuestDetail({ quest, campaign, onJump }) {
  const giver = campaign.npcs.find((n) => n.id === quest.giverId);
  const location = campaign.locations.find((l) => l.id === quest.locationId);
  const relatedNpcs = (quest.relatedNpcIds || []).map((id) => campaign.npcs.find((n) => n.id === id)).filter(Boolean);
  const relatedPcs = (quest.relatedPcIds || []).map((id) => campaign.pcs.find((p) => p.id === id)).filter(Boolean);
  const sessions = campaign.sessions.filter((s) => s.relatedQuestIds.includes(quest.id));
  const revealedClues = (quest.clues || []).filter((c) => c.revealed);
  const hiddenCount = (quest.clues || []).length - revealedClues.length;

  return (
    <>
      <h2 className="cf-playerview-detail-title">{quest.title || "Untitled"}</h2>
      <div className="cf-playerview-detail-meta">
        <span className="cf-badge">{titleCase(quest.status)}</span>
        {quest.arc && <span className="cf-badge cf-badge-muted">{quest.arc}</span>}
      </div>
      <Field label="Given by">
        <NameLink type="npcs" id={giver?.id} name={giver?.name} onJump={onJump} />
      </Field>
      <Field label="Location">
        <NameLink type="locations" id={location?.id} name={location?.name} onJump={onJump} />
      </Field>
      <Field label="Description">{quest.description}</Field>
      <Field label="Related NPCs">
        <LinkList items={relatedNpcs.map((n) => ({ type: "npcs", id: n.id, name: n.name }))} onJump={onJump} />
      </Field>
      <Field label="Related party members">
        <LinkList items={relatedPcs.map((p) => ({ type: "pcs", id: p.id, name: p.name }))} onJump={onJump} />
      </Field>
      <Field label="Rewards">{quest.rewards}</Field>
      <Field label="Clues discovered so far">
        {(revealedClues.length > 0 || hiddenCount > 0) && (
          <div className="cf-pv-clue-list">
            {revealedClues.map((c) => (
              <div key={c.id}>• {c.text}</div>
            ))}
            {hiddenCount > 0 && (
              <div className="cf-pv-clue-hidden">
                {hiddenCount} more clue{hiddenCount === 1 ? "" : "s"} yet to be discovered…
              </div>
            )}
          </div>
        )}
      </Field>
      <Field label="Sessions">
        <LinkList
          items={sessions.map((s) => ({
            type: "sessions",
            id: s.id,
            name: s.title ? `Session ${s.sessionNumber}: ${s.title}` : `Session ${s.sessionNumber}`,
          }))}
          onJump={onJump}
        />
      </Field>
      <Field label="Tags">
        <TagRow tags={quest.tags} />
      </Field>
    </>
  );
}

function FactionDetail({ faction, campaign, onJump }) {
  const members = campaign.npcs.filter((n) => n.factionId === faction.id);
  const rivals = (faction.rivalFactionIds || []).map((id) => campaign.factions.find((f) => f.id === id)).filter(Boolean);

  return (
    <>
      <h2 className="cf-playerview-detail-title">{faction.name || "Untitled"}</h2>
      <div className="cf-playerview-detail-meta">
        <span className="cf-badge">{titleCase(faction.standing)}</span>
      </div>
      <Field label="Agenda">{faction.agenda}</Field>
      <Field label="Members">
        <LinkList items={members.map((n) => ({ type: "npcs", id: n.id, name: n.name }))} onJump={onJump} />
      </Field>
      <Field label="Rivals">
        <LinkList items={rivals.map((f) => ({ type: "factions", id: f.id, name: f.name }))} onJump={onJump} />
      </Field>
      <Field label="Tags">
        <TagRow tags={faction.tags} />
      </Field>
    </>
  );
}

function PcDetail({ pc, campaign, onJump }) {
  const hometown = campaign.locations.find((l) => l.id === pc.hometownLocationId);
  const sessions = campaign.sessions.filter((s) => s.relatedPcIds.includes(pc.id));
  const connections = (pc.relationships || [])
    .map((r) => ({ rel: r, other: campaign.npcs.find((n) => n.id === r.npcId) }))
    .filter((x) => x.other);

  return (
    <>
      <h2 className="cf-playerview-detail-title">{pc.name || "Untitled"}</h2>
      <div className="cf-playerview-detail-meta">
        {pc.playerName && <span className="cf-badge">Played by {pc.playerName}</span>}
        {pc.classLevel && <span className="cf-badge cf-badge-muted">{pc.classLevel}</span>}
        {pc.race && <span className="cf-badge cf-badge-muted">{pc.race}</span>}
        {pc.status && pc.status !== "active" && <span className="cf-badge">{titleCase(pc.status)}</span>}
      </div>
      <Field label="Hometown">
        <NameLink type="locations" id={hometown?.id} name={hometown?.name} onJump={onJump} />
      </Field>
      <Field label="Backstory">{pc.backstory}</Field>
      <Field label="Connections">
        {connections.length > 0 && (
          <div className="cf-pv-list">
            {connections.map(({ rel, other }) => (
              <div key={rel.id}>
                {rel.label ? `${rel.label}: ` : ""}
                <NameLink type="npcs" id={other.id} name={other.name} onJump={onJump} />
              </div>
            ))}
          </div>
        )}
      </Field>
      <Field label="Sessions">
        <LinkList
          items={sessions.map((s) => ({
            type: "sessions",
            id: s.id,
            name: s.title ? `Session ${s.sessionNumber}: ${s.title}` : `Session ${s.sessionNumber}`,
          }))}
          onJump={onJump}
        />
      </Field>
      <Field label="Tags">
        <TagRow tags={pc.tags} />
      </Field>
    </>
  );
}

function SessionDetail({ session, campaign, onJump }) {
  const npcs = (session.relatedNpcIds || []).map((id) => campaign.npcs.find((n) => n.id === id)).filter(Boolean);
  const locations = (session.relatedLocationIds || []).map((id) => campaign.locations.find((l) => l.id === id)).filter(Boolean);
  const quests = (session.relatedQuestIds || []).map((id) => campaign.quests.find((q) => q.id === id)).filter(Boolean);
  const pcs = (session.relatedPcIds || []).map((id) => campaign.pcs.find((p) => p.id === id)).filter(Boolean);

  return (
    <>
      <h2 className="cf-playerview-detail-title">
        {session.title ? `Session ${session.sessionNumber}: ${session.title}` : `Session ${session.sessionNumber}`}
      </h2>
      <div className="cf-playerview-detail-meta">{session.date && <span className="cf-badge">{session.date}</span>}</div>
      <Field label="Recap">{session.summary}</Field>
      <Field label="NPCs">
        <LinkList items={npcs.map((n) => ({ type: "npcs", id: n.id, name: n.name }))} onJump={onJump} />
      </Field>
      <Field label="Locations">
        <LinkList items={locations.map((l) => ({ type: "locations", id: l.id, name: l.name }))} onJump={onJump} />
      </Field>
      <Field label="Quests">
        <LinkList items={quests.map((q) => ({ type: "quests", id: q.id, name: q.title }))} onJump={onJump} />
      </Field>
      <Field label="Party">
        <LinkList items={pcs.map((p) => ({ type: "pcs", id: p.id, name: p.name }))} onJump={onJump} />
      </Field>
      <Field label="Tags">
        <TagRow tags={session.tags} />
      </Field>
    </>
  );
}
