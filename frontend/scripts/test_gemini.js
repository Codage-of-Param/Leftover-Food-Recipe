async function test() {
  const GEMINI_MODEL = "gemini-1.5-flash";
  const apiKey = "AQ.Ab8RN6L5ELbf9DqX2JvMygIhy_ehqy-GDM3moEOa5BHumtLdoA";
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  const res = await fetch(geminiUrl);

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
