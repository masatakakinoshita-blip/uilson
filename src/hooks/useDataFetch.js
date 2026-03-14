import { useState, useEffect } from "react";

// ===== DATA FETCHING FUNCTIONS (exported individually) =====

export async function fetchGmail(token) {
  const res = await fetch(
    (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 2);
      return (
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=after:" +
        d.getFullYear() +
        "/" +
        (d.getMonth() + 1) +
        "/" +
        d.getDate()
      );
    })(),
    { headers: { Authorization: "Bearer " + token } }
  );
  if (res.status === 401) throw new Error("AUTH_EXPIRED");
  const data = await res.json();
  if (!data.messages) return [];
  const details = await Promise.all(
    data.messages.slice(0, 50).map((m) =>
      fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" +
          m.id +
          "?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date",
        { headers: { Authorization: "Bearer " + token } }
      ).then((r) => r.json())
    )
  );
  return details.map((d) => {
    const h = (n) =>
      (d.payload?.headers || []).find((x) => x.name === n)?.value || "";
    return {
      id: d.id,
      subject: h("Subject"),
      from: h("From"),
      date: h("Date"),
      snippet: d.snippet,
    };
  });
}

export async function fetchCalendar(token) {
  const headers = { Authorization: "Bearer " + token };
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  let calendarIds = ["primary"];
  try {
    const listRes = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers }
    );
    if (listRes.status === 401) throw new Error("AUTH_EXPIRED");
    const listData = await listRes.json();
    if (listData.items && listData.items.length) {
      calendarIds = listData.items
        .filter((c) => c.selected !== false)
        .map((c) => c.id);
    }
  } catch {}

  const allEvents = await Promise.all(
    calendarIds.map(async (calId) => {
      try {
        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/" +
            encodeURIComponent(calId) +
            "/events?maxResults=250&timeMin=" +
            oneMonthAgo.toISOString() +
            "&timeMax=" +
            oneMonthLater.toISOString() +
            "&orderBy=startTime&singleEvents=true",
          { headers }
        );
        const data = await res.json();
        return (data.items || []).map((e) => ({
          id: e.id,
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          location: e.location || "",
          calendar: e.organizer?.displayName || calId,
        }));
      } catch {
        return [];
      }
    })
  );

  const seen = new Set();
  return allEvents
    .flat()
    .filter((e) => {
      const key = (e.summary || "") + "|" + (e.start || "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.start || "").localeCompare(b.start || ""))
    .slice(0, 200);
}

export async function fetchOutlookMail(msToken) {
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const filterDate = oneMonthAgo.toISOString();
  const url =
    "https://graph.microsoft.com/v1.0/me/messages?$top=50&$filter=receivedDateTime ge " +
    filterDate +
    "&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview";
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + msToken },
  });
  if (res.status === 401) throw new Error("MS_AUTH_EXPIRED");
  const data = await res.json();
  return (data.value || []).map((m) => ({
    id: m.id,
    subject: m.subject || "",
    from:
      (m.from?.emailAddress?.name || "") +
      " <" +
      (m.from?.emailAddress?.address || "") +
      ">",
    date: m.receivedDateTime || "",
    snippet: m.bodyPreview || "",
  }));
}

export async function fetchOutlookCalendar(msToken) {
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const url =
    "https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=" +
    oneMonthAgo.toISOString() +
    "&endDateTime=" +
    oneMonthLater.toISOString() +
    "&$top=200&$orderby=start/dateTime&$select=id,subject,start,end,location";
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + msToken },
  });
  if (res.status === 401) throw new Error("MS_AUTH_EXPIRED");
  const data = await res.json();
  return (data.value || []).map((e) => ({
    id: e.id,
    summary: e.subject || "",
    start: e.start?.dateTime || "",
    end: e.end?.dateTime || "",
    location: e.location?.displayName || "",
  }));
}

export async function fetchSharePointSites(tk) {
  try {
    const r = await fetch(
      "https://graph.microsoft.com/v1.0/sites?search=*&$top=20&$select=id,displayName,webUrl,description",
      { headers: { Authorization: "Bearer " + tk } }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.value || []).map((s) => ({
      id: s.id,
      name: s.displayName,
      url: s.webUrl,
      desc: s.description,
    }));
  } catch {
    return [];
  }
}

export async function fetchSharePointFiles(tk, siteId) {
  try {
    const r = await fetch(
      "https://graph.microsoft.com/v1.0/sites/" +
        siteId +
        "/drive/root/children?$top=50&$select=id,name,webUrl,size,lastModifiedDateTime,file,folder",
      { headers: { Authorization: "Bearer " + tk } }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.value || []).map((f) => ({
      id: f.id,
      name: f.name,
      url: f.webUrl,
      size: f.size,
      modified: f.lastModifiedDateTime,
      isFolder: !!f.folder,
    }));
  } catch {
    return [];
  }
}

export async function fetchAllSharePointData(tk) {
  const sites = await fetchSharePointSites(tk);
  let allFiles = [];
  for (const site of sites.slice(0, 5)) {
    const files = await fetchSharePointFiles(tk, site.id);
    allFiles = allFiles.concat(files.map((f) => ({ ...f, siteName: site.name })));
  }
  return { sites, files: allFiles };
}

export async function fetchTeamsChats(tk) {
  try {
    const r = await fetch(
      "https://graph.microsoft.com/v1.0/me/chats?$top=20&$expand=lastMessagePreview&$orderby=lastMessagePreview/createdDateTime desc",
      { headers: { Authorization: "Bearer " + tk } }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.value || []).map((ch) => ({
      id: ch.id,
      topic: ch.topic || "(no topic)",
      type: ch.chatType,
      lastMsg: ch.lastMessagePreview
        ? {
            from: ch.lastMessagePreview.from?.user?.displayName || "",
            body: (ch.lastMessagePreview.body?.content || "")
              .replace(/<[^>]*>/g, "")
              .substring(0, 200),
            date: ch.lastMessagePreview.createdDateTime,
          }
        : null,
    }));
  } catch (e) {
    console.error("Teams chats err", e);
    return [];
  }
}

export async function fetchTeamsChannelMessages(tk) {
  try {
    const tr = await fetch(
      "https://graph.microsoft.com/v1.0/me/joinedTeams?$top=10",
      { headers: { Authorization: "Bearer " + tk } }
    );
    if (!tr.ok) return [];
    const td = await tr.json();
    const teams = td.value || [];
    const results = [];
    for (const team of teams.slice(0, 5)) {
      const cr = await fetch(
        "https://graph.microsoft.com/v1.0/teams/" +
          team.id +
          "/channels?$top=5",
        { headers: { Authorization: "Bearer " + tk } }
      );
      if (!cr.ok) continue;
      const cd = await cr.json();
      for (const ch of (cd.value || []).slice(0, 3)) {
        try {
          const mr = await fetch(
            "https://graph.microsoft.com/v1.0/teams/" +
              team.id +
              "/channels/" +
              ch.id +
              "/messages?$top=5",
            { headers: { Authorization: "Bearer " + tk } }
          );
          if (!mr.ok) continue;
          const md = await mr.json();
          (md.value || []).forEach((m) => {
            results.push({
              team: team.displayName,
              channel: ch.displayName,
              from: m.from?.user?.displayName || "",
              body: (m.body?.content || "")
                .replace(/<[^>]*>/g, "")
                .substring(0, 200),
              date: m.createdDateTime,
            });
          });
        } catch (e) {}
      }
    }
    return results;
  } catch (e) {
    console.error("Teams channels err", e);
    return [];
  }
}

export async function fetchGoogleDriveFiles(token) {
  try {
    const r = await fetch(
      "https://www.googleapis.com/drive/v3/files?pageSize=50&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,owners,webViewLink)&q=trashed=false",
      { headers: { Authorization: "Bearer " + token } }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      type: f.mimeType,
      modified: f.modifiedTime,
      owner: f.owners && f.owners[0] ? f.owners[0].displayName : "",
      link: f.webViewLink || "",
    }));
  } catch (e) {
    console.error("Drive err", e);
    return [];
  }
}

export async function fetchSlack(tk) {
  if (!tk) return { connected: false, messages: [] };
  try {
    const url = "/api/slack-messages?token=" + encodeURIComponent(tk);
    const res = await fetch(url);
    const data = await res.json();
    if (data.connected) return { connected: true, messages: data.messages || [] };
    return { connected: false, messages: [] };
  } catch {
    return { connected: false, messages: [] };
  }
}

export async function fetchZoomProfile(zoomToken) {
  try {
    const res = await fetch("/api/zoom-meetings?action=me", {
      headers: { "x-zoom-token": zoomToken },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchZoomMeetings(zoomToken) {
  try {
    const res = await fetch("/api/zoom-meetings?action=list&type=upcoming", {
      headers: { "x-zoom-token": zoomToken },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.meetings || []).map((m) => ({
      id: m.id,
      topic: m.topic,
      start_time: m.start_time,
      duration: m.duration,
      timezone: m.timezone,
      join_url: m.join_url,
      host_email: m.host_email,
      type: m.type,
    }));
  } catch {
    return [];
  }
}

export function extractReply(data) {
  if (Array.isArray(data.content)) {
    return data.content.map((c) => c.text || "").join("");
  }
  if (typeof data.content === "string") return data.content;
  if (data.error) {
    if (typeof data.error === "string") return data.error;
    if (data.error.message) return data.error.message;
    return JSON.stringify(data.error);
  }
  if (data.message) return data.message;
  return "Error: unexpected response";
}

export function buildContext(
  emails,
  events,
  slackMsgs,
  outlookEmails,
  outlookEvents,
  spSites,
  spFiles,
  teamsChats,
  teamsChannels,
  driveFiles
) {
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  let ctx = "";

  if (emails.length) {
    ctx += "\n## Gmail (latest " + emails.length + ")\n";
    emails.forEach((e) => {
      const d = e.date ? new Date(e.date) : null;
      const dow = d && !isNaN(d) ? "(" + dayNames[d.getDay()] + ")" : "";
      ctx +=
        "- [ID:" +
        e.id +
        "] From:" +
        e.from +
        " Sub:" +
        e.subject +
        " Date:" +
        e.date +
        dow +
        " Snippet:" +
        e.snippet +
        "\n";
    });
  }

  if (events.length) {
    ctx += "\n## Google Calendar (upcoming " + events.length + ")\n";
    events.forEach((e) => {
      const ds = e.start ? new Date(e.start) : null;
      const de = e.end ? new Date(e.end) : null;
      const dowStart = ds ? "(" + dayNames[ds.getDay()] + ")" : "";
      const dowEnd = de ? "(" + dayNames[de.getDay()] + ")" : "";
      ctx +=
        "- [ID:" +
        e.id +
        "] " +
        e.summary +
        " " +
        e.start +
        dowStart +
        " ~ " +
        e.end +
        dowEnd +
        (e.location ? " @" + e.location : "") +
        (e.calendar ? " [" + e.calendar + "]" : "") +
        "\n";
    });
  }

  if (slackMsgs && slackMsgs.length) {
    ctx += "\n## Slack (latest " + slackMsgs.length + ")\n";
    slackMsgs.forEach((m) => {
      ctx +=
        "- #" +
        m.channel +
        " " +
        m.userName +
        ": " +
        m.text +
        " (" +
        m.date +
        ")\n";
    });
  }

  if (outlookEmails && outlookEmails.length) {
    ctx += "\n## Outlook Mail (latest " + outlookEmails.length + ")\n";
    outlookEmails.forEach((e) => {
      const d = e.date ? new Date(e.date) : null;
      const dow = d && !isNaN(d) ? "(" + dayNames[d.getDay()] + ")" : "";
      ctx +=
        "- [ID:" +
        e.id +
        "] From:" +
        e.from +
        " Sub:" +
        e.subject +
        " Date:" +
        e.date +
        dow +
        " Snippet:" +
        e.snippet +
        "\n";
    });
  }

  if (outlookEvents && outlookEvents.length) {
    ctx += "\n## Outlook Calendar (upcoming " + outlookEvents.length + ")\n";
    outlookEvents.forEach((e) => {
      const ds = e.start ? new Date(e.start) : null;
      const de = e.end ? new Date(e.end) : null;
      const dowStart =
        ds && !isNaN(ds) ? "(" + dayNames[ds.getDay()] + ")" : "";
      const dowEnd = de && !isNaN(de) ? "(" + dayNames[de.getDay()] + ")" : "";
      ctx +=
        "- [ID:" +
        e.id +
        "] " +
        e.summary +
        " " +
        e.start +
        dowStart +
        " ~ " +
        e.end +
        dowEnd +
        (e.location ? " @" + e.location : "") +
        "\n";
    });
  }

  if (spSites.length > 0) {
    ctx +=
      "\n\n[SharePoint Sites]\n" +
      spSites
        .map((s) => s.name + " - " + s.url + (s.desc ? " (" + s.desc + ")" : ""))
        .join("\n");
  }

  if (spFiles.length > 0) {
    ctx +=
      "\n\n[SharePoint Files]\n" +
      spFiles
        .map(
          (f) =>
            f.name +
            " (" +
            f.siteName +
            ") - " +
            f.url +
            (f.isFolder
              ? " [folder]"
              : " " + Math.round((f.size || 0) / 1024) + "KB")
        )
        .join("\n");
  }

  if (teamsChats && teamsChats.length > 0) {
    ctx += "\n\n## Teams Chats (Recent):\n";
    teamsChats.forEach((ch) => {
      ctx += "- " + ch.topic + " (" + ch.type + ")";
      if (ch.lastMsg) {
        ctx +=
          " | Last: " +
          ch.lastMsg.from +
          ": " +
          ch.lastMsg.body +
          " (" +
          ch.lastMsg.date +
          ")";
      }
      ctx += "\n";
    });
  }

  if (teamsChannels && teamsChannels.length > 0) {
    ctx += "\n\n## Teams Channel Messages (Recent):\n";
    teamsChannels.forEach((m) => {
      ctx +=
        "- [" +
        m.team +
        " > " +
        m.channel +
        "] " +
        m.from +
        ": " +
        m.body +
        " (" +
        m.date +
        ")\n";
    });
  }

  if (driveFiles && driveFiles.length > 0) {
    ctx += "\n\n## Google Drive Files (Recent):\n";
    driveFiles.forEach((f) => {
      const d = new Date(f.modified);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      ctx +=
        "- " +
        f.name +
        " (" +
        f.type +
        ") | Modified: " +
        days[d.getDay()] +
        " " +
        d.toLocaleDateString() +
        " | Owner: " +
        f.owner +
        "\n";
    });
  }

  return ctx;
}

// ===== HOOK IMPLEMENTATION =====

export default function useDataFetch(auth) {
  // State for all data
  const [emails, setEmails] = useState([]);
  const [events, setEvents] = useState([]);
  const [slackMsgs, setSlackMsgs] = useState([]);
  const [outlookEmails, setOutlookEmails] = useState([]);
  const [outlookEvents, setOutlookEvents] = useState([]);
  const [spSites, setSpSites] = useState([]);
  const [spFiles, setSpFiles] = useState([]);
  const [teamsChats, setTeamsChats] = useState([]);
  const [teamsChannels, setTeamsChannels] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  const [zoomMeetings, setZoomMeetings] = useState([]);

  // Effect: Google data fetch (Gmail, Calendar, Drive, Profile)
  useEffect(() => {
    if (auth.token) {
      fetchGmail(auth.token)
        .then(setEmails)
        .catch((e) => {
          console.error(e);
          if (e.message === "AUTH_EXPIRED") {
            auth.logout();
          }
        });

      fetchCalendar(auth.token)
        .then(setEvents)
        .catch((e) => {
          console.error(e);
          if (e.message === "AUTH_EXPIRED") {
            auth.logout();
          }
        });

      fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: "Bearer " + auth.token },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.emailAddress) {
            auth.setGoogleEmail(d.emailAddress);
            localStorage.setItem("g_email", d.emailAddress);
          }
        })
        .catch(console.error);

      fetchGoogleDriveFiles(auth.token)
        .then(setDriveFiles)
        .catch(console.error);
    }
  }, [auth.token]);

  // Effect: Slack data fetch
  useEffect(() => {
    if (auth.slackToken) {
      fetchSlack(auth.slackToken)
        .then((r) => {
          auth.setSlackConnected(r.connected);
          setSlackMsgs(r.messages);
        })
        .catch(console.error);

      fetch(
        "/api/slack-userinfo?token=" + encodeURIComponent(auth.slackToken)
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            const info =
              d.email ||
              (d.user ? d.user + " @ " + (d.team || "Slack") : null);
            if (info) {
              auth.setSlackEmail(info);
              localStorage.setItem("slack_email", info);
            }
          }
        })
        .catch(console.error);
    }
  }, [auth.slackToken]);

  // Effect: Outlook / Microsoft data fetch
  useEffect(() => {
    if (auth.msToken) {
      fetchOutlookMail(auth.msToken)
        .then(setOutlookEmails)
        .catch((e) => {
          console.error(e);
          if (e.message === "MS_AUTH_EXPIRED") {
            auth.msLogout();
          }
        });

      fetchOutlookCalendar(auth.msToken)
        .then(setOutlookEvents)
        .catch((e) => {
          console.error(e);
          if (e.message === "MS_AUTH_EXPIRED") {
            auth.msLogout();
          }
        });

      fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: "Bearer " + auth.msToken },
      })
        .then((r) => r.json())
        .then((d) => {
          const email = d.mail || d.userPrincipalName || "";
          if (email) {
            auth.setMsEmail(email);
            localStorage.setItem("ms_email", email);
          }
        })
        .catch(console.error);

      // BUG FIX: Line 621 used 'tk' instead of 'auth.msToken'
      fetchAllSharePointData(auth.msToken)
        .then((spData) => {
          setSpSites(spData.sites);
          setSpFiles(spData.files);
        })
        .catch(console.error);

      // BUG FIX: Line 621 used 'tk' instead of 'auth.msToken'
      fetchTeamsChats(auth.msToken)
        .then(setTeamsChats)
        .catch(console.error);

      // BUG FIX: Line 621 used 'tk' instead of 'auth.msToken'
      fetchTeamsChannelMessages(auth.msToken)
        .then(setTeamsChannels)
        .catch(console.error);
    }
  }, [auth.msToken]);

  // Effect: Zoom data fetch
  useEffect(() => {
    if (auth.zoomToken) {
      fetchZoomProfile(auth.zoomToken)
        .then((profile) => {
          if (profile && profile.email) {
            auth.setZoomEmail(profile.email);
            localStorage.setItem("zoom_email", profile.email);
          }
        })
        .catch(console.error);

      fetchZoomMeetings(auth.zoomToken)
        .then(setZoomMeetings)
        .catch(console.error);
    }
  }, [auth.zoomToken]);

  // Get context by refreshing all data
  const getContext = async () => {
    let e = emails;
    let ev = events;
    let sm = slackMsgs;
    let oe = outlookEmails;
    let oev = outlookEvents;
    let ss = spSites;
    let sf = spFiles;
    let tc = teamsChats;
    let tch = teamsChannels;
    let df = driveFiles;

    if (auth.token) {
      try {
        e = await fetchGmail(auth.token);
        setEmails(e);
        ev = await fetchCalendar(auth.token);
        setEvents(ev);
        // BUG FIX: Line 606 used 't' instead of 'auth.token' for fetchGoogleDriveFiles
        df = await fetchGoogleDriveFiles(auth.token);
        setDriveFiles(df);
      } catch {}
    }

    try {
      const r = await fetchSlack(auth.slackToken);
      sm = r.messages;
      setSlackMsgs(sm);
      auth.setSlackConnected(r.connected);
    } catch {}

    if (auth.msToken) {
      try {
        oe = await fetchOutlookMail(auth.msToken);
        setOutlookEmails(oe);
        oev = await fetchOutlookCalendar(auth.msToken);
        setOutlookEvents(oev);
        // BUG FIX: Line 621 used 'tk' instead of 'auth.msToken'
        const spData = await fetchAllSharePointData(auth.msToken);
        ss = spData.sites;
        sf = spData.files;
        setSpSites(ss);
        setSpFiles(sf);
        tc = await fetchTeamsChats(auth.msToken);
        setTeamsChats(tc);
        tch = await fetchTeamsChannelMessages(auth.msToken);
        setTeamsChannels(tch);
      } catch {}
    }

    return buildContext(e, ev, sm, oe, oev, ss, sf, tc, tch, df);
  };

  // Send message with AI context
  const send = async (text, messages, setMessages) => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text };
    setMessages((p) => [...p, userMsg]);

    try {
      const ctx = await getContext();
      const dowNames = ["日", "月", "火", "水", "木", "金", "土"];
      const currentDate = new Date();
      const systemPrompt =
        "You are UILSON, a professional AI business assistant. Current: " +
        currentDate.toLocaleString("ja-JP") +
        " (" +
        dowNames[currentDate.getDay()] +
        "曜日)" +
        "\nUser data:" +
        ctx +
        "\nReply in user language. For greetings, give a brief daily briefing using Gmail, Calendar, Slack, and Outlook data." +
        "\nIMPORTANT: Calendar events already include correct day-of-week labels like (月)(火). Always use these labels as-is. Never guess or recalculate day-of-week yourself." +
        "\nFor Outlook calendar operations, use outlook_calendar_create/update/delete tools." +
        "\nIMPORTANT: When user asks about specific emails or calendar events not shown in the context above, ALWAYS use search tools (outlook_search_mail, outlook_list_events, gmail_search) to dynamically fetch data from the server. NEVER say data is unavailable without trying the search tools first." +
        "\nFor Slack operations: use slack_search_users to find people by name/email, slack_read_dm to read DM history, slack_send_dm to send messages. ALWAYS use slack_search_users when asked to find or search for someone on Slack." +
        "\nFor Google Drive: use google_drive_search/google_drive_list/google_drive_get_content tools.";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg]
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content })),
          system: systemPrompt,
          googleToken: auth.token,
          msToken: auth.msToken,
          slackToken: auth.slackToken,
        }),
      });

      const data = await res.json();
      const reply = extractReply(data);
      setMessages((p) => [...p, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "Error: " + err.message },
      ]);
    }
  };

  return {
    emails,
    setEmails,
    events,
    setEvents,
    slackMsgs,
    setSlackMsgs,
    outlookEmails,
    setOutlookEmails,
    outlookEvents,
    setOutlookEvents,
    spSites,
    setSpSites,
    spFiles,
    setSpFiles,
    teamsChats,
    setTeamsChats,
    teamsChannels,
    setTeamsChannels,
    driveFiles,
    setDriveFiles,
    zoomMeetings,
    setZoomMeetings,
    getContext,
    send,
    extractReply,
  };
}
