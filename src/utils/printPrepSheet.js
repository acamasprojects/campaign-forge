// Builds a plain, printer-friendly HTML document (light background, no app
// chrome) summarizing what a DM needs at the table: the last recap, active
// quests, the party, and anything pinned. Opens in a new tab and triggers
// the browser's print dialog — no PDF library needed.

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function buildPrepSheetHtml(campaign) {
  const lastSession = campaign.sessions.reduce(
    (best, s) => (!best || (s.sessionNumber || 0) > (best.sessionNumber || 0) ? s : best),
    null
  );
  const activeQuests = campaign.quests.filter((q) => q.status === "active");
  const npcName = (id) => campaign.npcs.find((n) => n.id === id)?.name || "";
  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || "";

  const arcGroups = new Map();
  activeQuests.forEach((q) => {
    const key = q.arc || "No arc";
    if (!arcGroups.has(key)) arcGroups.set(key, []);
    arcGroups.get(key).push(q);
  });

  const pinned = [
    ...campaign.npcs.filter((n) => n.pinned).map((n) => ({ kind: "NPC", label: n.name })),
    ...campaign.pcs.filter((p) => p.pinned).map((p) => ({ kind: "PC", label: p.name })),
    ...campaign.factions.filter((f) => f.pinned).map((f) => ({ kind: "Faction", label: f.name })),
    ...campaign.locations.filter((l) => l.pinned).map((l) => ({ kind: "Location", label: l.name })),
    ...campaign.quests.filter((q) => q.pinned).map((q) => ({ kind: "Quest", label: q.title })),
    ...campaign.sessions
      .filter((s) => s.pinned)
      .map((s) => ({ kind: "Session", label: `Session ${s.sessionNumber}${s.title ? `: ${s.title}` : ""}` })),
  ];

  const questsHtml = Array.from(arcGroups.entries())
    .map(
      ([arc, quests]) => `
    <h3>${esc(arc)}</h3>
    <ul>
      ${quests
        .map(
          (q) => `
        <li>
          <strong>${esc(q.title || "Untitled quest")}</strong>
          ${q.giverId ? ` — giver: ${esc(npcName(q.giverId))}` : ""}
          ${q.locationId ? ` — at: ${esc(locationName(q.locationId))}` : ""}
          ${q.description ? `<div class="desc">${esc(q.description)}</div>` : ""}
        </li>`
        )
        .join("")}
    </ul>`
    )
    .join("");

  const partyHtml =
    campaign.pcs.length === 0
      ? ""
      : `
    <h2>Party</h2>
    <ul>
      ${campaign.pcs
        .map(
          (p) => `
        <li><strong>${esc(p.name || "Untitled")}</strong>${p.playerName ? ` (played by ${esc(p.playerName)})` : ""}${
            p.classLevel ? ` — ${esc(p.classLevel)}` : ""
          }</li>`
        )
        .join("")}
    </ul>`;

  const pinnedHtml =
    pinned.length === 0
      ? ""
      : `
    <h2>Pinned</h2>
    <ul>
      ${pinned.map((p) => `<li><span class="kind">${esc(p.kind)}</span> ${esc(p.label || "Untitled")}</li>`).join("")}
    </ul>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(campaign.name)} — Session Prep</title>
<style>
  body { font-family: Georgia, serif; color: #1a1a1a; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.5; }
  h1 { font-size: 22px; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; }
  h2 { font-size: 17px; margin-top: 28px; border-bottom: 1px solid #999; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 16px 0 4px; color: #444; }
  .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  ul { margin: 0 0 12px; padding-left: 20px; }
  li { margin-bottom: 8px; }
  .desc { color: #444; font-size: 13px; margin-top: 2px; }
  .kind { font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: #888; margin-right: 6px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>${esc(campaign.name)} — Session Prep</h1>
  <div class="meta">Generated ${new Date().toLocaleDateString()}</div>

  ${
    lastSession
      ? `
  <h2>Last Session</h2>
  <p><strong>Session ${lastSession.sessionNumber}${lastSession.title ? `: ${esc(lastSession.title)}` : ""}</strong> (${esc(
          lastSession.date
        )})</p>
  ${lastSession.summary ? `<p>${esc(lastSession.summary).replace(/\n/g, "<br>")}</p>` : ""}`
      : ""
  }

  <h2>Active Quests</h2>
  ${activeQuests.length === 0 ? "<p>No active quests.</p>" : questsHtml}

  ${partyHtml}
  ${pinnedHtml}
</body>
</html>`;
}

export function printPrepSheet(campaign) {
  const html = buildPrepSheetHtml(campaign);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups for this site to print the prep sheet.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
