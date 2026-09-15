async function trigger() {
  try {
    const res = await fetch("http://127.0.0.1:3000/api/import-datasets", { method: "POST" });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch failed. Next.js might not be running on port 3000.", err.message);
  }
}

trigger();
