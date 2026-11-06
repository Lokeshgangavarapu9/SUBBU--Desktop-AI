async function test() {
  const t0 = Date.now();
  let ttft = null;
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3.5:2b-q4_K_M',
      prompt: 'Hello warm',
      stream: true,
      options: { num_predict: 32 }
    })
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const txt = dec.decode(value);
    if (!ttft && txt.includes('"response":')) ttft = Date.now() - t0;
  }
  console.log(`WARM_TTFT_MS=${ttft || (Date.now() - t0)}`);
  console.log(`WARM_TOTAL_MS=${Date.now() - t0}`);
}
test();

