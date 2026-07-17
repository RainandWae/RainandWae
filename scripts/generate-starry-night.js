const fs = require("fs");
const path = require("path");

const username = process.env.GITHUB_USERNAME || "RainandWae";
const token = process.env.GITHUB_TOKEN;
const outputDir = path.join(process.cwd(), "dist");
const outputFile = path.join(outputDir, "starry-night-contributions.svg");

const palette = {
  empty: "#0b1020",
  grid: "#23283a",
  levels: {
    NONE: "#161b2d",
    FIRST_QUARTILE: "#20283a",
    SECOND_QUARTILE: "#293247",
    THIRD_QUARTILE: "#343d54",
    FOURTH_QUARTILE: "#424b62",
  },
  starDim: "#6b5a2b",
  starMid: "#c99a35",
  glow: "#fff4b8",
  text: "#fff0b3",
  muted: "#b7a777",
};

const twinkleDensity = 0.04;

const query = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
              weekday
            }
          }
        }
      }
    }
  }
`;

async function fetchCalendar() {
  if (!token) {
    return demoCalendar();
  }

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "starry-night-profile-readme",
    },
    body: JSON.stringify({ query, variables: { login: username } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data.user.contributionsCollection.contributionCalendar;
}

function demoCalendar() {
  const weeks = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 52 * 7);

  for (let week = 0; week < 53; week += 1) {
    const contributionDays = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + weekday);
      const wave = Math.sin((week + weekday) / 4) + Math.cos(week / 7);
      const count = Math.max(0, Math.round((wave + 1.5) * Math.random() * 3));
      contributionDays.push({
        date: date.toISOString().slice(0, 10),
        contributionCount: count,
        contributionLevel: levelForCount(count),
        weekday,
      });
    }
    weeks.push({ contributionDays });
  }

  return {
    totalContributions: weeks.flatMap((week) => week.contributionDays)
      .reduce((sum, day) => sum + day.contributionCount, 0),
    weeks,
  };
}

function levelForCount(count) {
  if (count <= 0) return "NONE";
  if (count <= 2) return "FIRST_QUARTILE";
  if (count <= 4) return "SECOND_QUARTILE";
  if (count <= 7) return "THIRD_QUARTILE";
  return "FOURTH_QUARTILE";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randomUnit(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function starDelay(weekIndex, weekday) {
  return (randomUnit((weekIndex + 1) * 97 + (weekday + 1) * 193) * 36).toFixed(2);
}

function starDuration(weekIndex, weekday) {
  const speed = randomUnit((weekIndex + 1) * 389 + (weekday + 1) * 571);
  return (2.8 + speed * speed * 16).toFixed(2);
}

function starLitOpacity(weekIndex, weekday) {
  return (0.86 + randomUnit((weekIndex + 1) * 811 + (weekday + 1) * 997) * 0.14).toFixed(2);
}

function shouldTwinkle(weekIndex, weekday) {
  return randomUnit((weekIndex + 1) * 1543 + (weekday + 1) * 2203) < twinkleDensity;
}

function renderSvg(calendar) {
  const cell = 11;
  const gap = 4;
  const left = 28;
  const top = 44;
  const weeks = calendar.weeks;
  const width = left * 2 + weeks.length * (cell + gap) - gap;
  const height = 174;

  const stars = [];
  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach((day) => {
      const x = left + weekIndex * (cell + gap);
      const y = top + day.weekday * (cell + gap);
      const levelColor = palette.levels[day.contributionLevel] || palette.levels.NONE;
      const twinkles = shouldTwinkle(weekIndex, day.weekday);
      const delay = twinkles ? starDelay(weekIndex, day.weekday) : null;
      const duration = twinkles ? starDuration(weekIndex, day.weekday) : null;
      const litOpacity = twinkles ? starLitOpacity(weekIndex, day.weekday) : null;
      const title = `${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"}`;
      const animation = twinkles
        ? `
            <animate attributeName="fill" values="${palette.starDim};${palette.glow};${palette.starMid};${palette.starDim}" begin="${delay}s" dur="${duration}s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" />
            <animate attributeName="opacity" values=".28;${litOpacity};.48;.28" begin="${delay}s" dur="${duration}s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" />`
        : "";
      const fill = twinkles ? palette.starDim : levelColor;
      const opacity = twinkles ? ".28" : ".42";

      stars.push(`
        <g>
          <title>${escapeXml(title)}</title>
          <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${fill}" opacity="${opacity}" stroke="${palette.grid}" stroke-width="1">${animation}
          </rect>
        </g>`);
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(username)} star field contribution graph</title>
  <desc id="desc">A muted GitHub contribution graph with a small number of individual yellow squares that brighten and fade like stars at varied speeds.</desc>
  <rect width="${width}" height="${height}" rx="8" fill="${palette.empty}" />
  <text x="${left}" y="24" fill="${palette.text}" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="15" font-weight="600">RainandWae / star field</text>
  <text x="${width - left}" y="24" text-anchor="end" fill="${palette.muted}" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="12">${calendar.totalContributions} contributions</text>
  <g shape-rendering="geometricPrecision">
    ${stars.join("\n")}
  </g>
  <g transform="translate(${left}, 154)" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="10" fill="${palette.muted}">
    <text x="0" y="0">dim</text>
    <rect x="76" y="-9" width="10" height="10" rx="2" fill="${palette.starDim}" />
    <rect x="92" y="-9" width="10" height="10" rx="2" fill="${palette.starMid}" />
    <rect x="108" y="-9" width="10" height="10" rx="2" fill="${palette.glow}" />
    <text x="142" y="0">bright</text>
  </g>
</svg>
`;
}

async function main() {
  const calendar = await fetchCalendar();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, renderSvg(calendar), "utf8");
  console.log(`Generated ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
