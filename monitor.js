require("dotenv").config();
const db = require("./db");

async function checkwebsite(site) {
  const starttime = Date.now();

  try {
    const respone = await fetch(site.url, {
      signal: AbortSignal.timeout(5000),
    });

    const responetime = Date.now() - starttime;

    if (respone.ok) {

        console.log(`UP | ${site.url} | ${responetime}ms`);

      if (site.is_down) {
        await sendNotification(site.url, "✅ Recovered!");
      }
      await db.query(
        "UPDATE sites SET fail_count = 0, is_down = FALSE WHERE id = ?",
        [site.id],
      );

      await db.query(
        "INSERT INTO check_logs (site_id, status, response_time_ms) VALUES (?, 'UP', ?)",
        [site.id, responetime],
      );
    } else {
      handlefailure(site, respone.statusText);
    }
  } catch (error) {
    handlefailure(site, error.message);
  }
}

async function handlefailure(site, message) {
  const newFailCount = site.fail_count + 1;

  if (newFailCount === 3 && !site.is_down) {
    await sendNotification(site.url, message);
    await db.query(
      "UPDATE sites SET fail_count = ?, is_down = TRUE WHERE id = ?",
      [newFailCount, site.id],
    );
  } else {
    await db.query("UPDATE sites SET fail_count = ? WHERE id = ?", [
      newFailCount,
      site.id,
    ]);
  }

  await db.query(
    "INSERT INTO check_logs (site_id, status, error_message) VALUES (?, 'DOWN', ?)",
    [site.id, message],
  );
  console.log(`DOWN | ${site.url} | Strike ${newFailCount} | ${message}`);
}

setInterval(async () => {
  console.log(`\n--- checking at ${new Date().toLocaleDateString()}---`);

  const [sites] = await db.query("SELECT * FROM sites");

  for (const site of sites) {
    checkwebsite(site);
  }
}, 60000);

const discord_url = process.env.DISCORD_WEBHOOK;

async function sendNotification(url, message) {
  console.log(`ALERT SENT :${url}-${message}`);

  try {
    await fetch(discord_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `Website Alert! site ${url}\n Status ${message}`,
      }),
    });
  } catch (err) {
    console.log("Failed to send Discrod alert:", err.message);
  }
}
