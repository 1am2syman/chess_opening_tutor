export class EngineAdapter {
  constructor(onStatus) {
    this.onStatus = onStatus; this.worker = null; this.url = null; this.ready = false;
    this.active = null; this.pending = null; this.version = 0; this.timer = null; this.disposed = false; this.loading = false;
  }
  async load() {
    if (this.loading || this.worker || this.disposed) return;
    this.loading = true;
    this.onStatus('Loading Stockfish…');
    const controller = new AbortController();
    const downloadTimer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('https://cdn.jsdelivr.net/npm/stockfish@10.0.2/src/stockfish.js', { signal: controller.signal });
      if (!response.ok) throw new Error('Engine download failed');
      if (this.disposed) return;
      this.url = URL.createObjectURL(new Blob([await response.text()], { type:'text/javascript' }));
      if (this.disposed) { URL.revokeObjectURL(this.url); return; }
      this.worker = new Worker(this.url+'#https://cdn.jsdelivr.net/npm/stockfish@10.0.2/src/stockfish.wasm');
      this.worker.onmessage = event => this.receive(String(event.data));
      this.worker.onerror = () => this.fail('Engine unavailable. Study and recall still work.');
      this.timer = setTimeout(() => this.fail('Engine loading timed out. Retry from Settings.'),30000);
      this.send('uci');
    } catch { this.fail('Engine could not load. Check your connection, then retry from Settings.'); }
    finally { clearTimeout(downloadTimer); this.loading = false; }
  }
  send(command) { this.worker?.postMessage(command); }
  receive(text) {
    if (text==='uciok') {
      this.send('setoption name Hash value 16'); this.send('setoption name MultiPV value 3'); this.send('isready');
    } else if (text==='readyok') {
      clearTimeout(this.timer); this.ready = true; this.onStatus('Stockfish ready'); this.start();
    } else if (text.startsWith('info ') && this.active?.version === this.version) {
      const score=text.match(/score (cp|mate) (-?\d+)/), pv=text.match(/ pv (.+)/), depth=text.match(/ depth (\d+)/), multi=text.match(/ multipv (\d+)/);
      if (!score || !pv || text.includes('lowerbound') || text.includes('upperbound')) return;
      const sign=this.active.fen.split(' ')[1]==='w'?1:-1;
      const result={ type:score[1], value:Number(score[2])*sign, pv:pv[1].split(' '), depth:Number(depth?.[1] || 0), index:Number(multi?.[1] || 1)-1 };
      this.active.results[result.index]=result; this.active.onInfo(result);
    } else if (text.startsWith('bestmove')) {
      clearTimeout(this.timer);
      if (this.active?.version===this.version) this.active.onDone(this.active.results);
      this.active=null; this.start();
    }
  }
  request(fen,onInfo,onDone=()=>{}) {
    const version=++this.version; this.pending={fen,onInfo,onDone,version,results:[]};
    if (this.active) this.send('stop'); else this.start();
  }
  start() {
    if (!this.ready || !this.pending || this.active) return;
    this.active=this.pending; this.pending=null;
    this.send('position fen '+this.active.fen); this.send('go movetime 1200');
    clearTimeout(this.timer); this.timer=setTimeout(()=>this.fail('Engine stopped responding. Retry from Settings.'),12000);
  }
  pause() { ++this.version; this.pending=null; this.send('stop'); }
  fail(message) { this.pause(); this.active=null; this.ready=false; this.worker?.terminate(); this.worker=null; clearTimeout(this.timer); this.onStatus(message); }
  dispose() { this.disposed=true; this.pause(); this.worker?.terminate(); clearTimeout(this.timer); if(this.url)URL.revokeObjectURL(this.url); }
}
export function scoreLabel(result) {
  if(result.type==='mate')return (result.value<0?'-M':'M')+Math.abs(result.value);
  return (result.value>0?'+':'')+(result.value/100).toFixed(1);
}
