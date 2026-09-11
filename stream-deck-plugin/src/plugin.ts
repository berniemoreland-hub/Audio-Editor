import http from 'node:http';
import streamDeck, { action, type KeyDownEvent, type KeyUpEvent, SingletonAction } from '@elgato/streamdeck';

const HOST = '127.0.0.1';
const PORT = 17631;

type VoxCommand =
  | 'record' | 'stop' | 'play'
  | 'jog-slow-left' | 'jog-slow-right' | 'jog-fast-left' | 'jog-fast-right'
  | 'cut' | 'copy' | 'paste' | 'delete' | 'undo' | 'save' | 'save-as' | 'export';

function sendCommand(command: VoxCommand): Promise<boolean> {
  return new Promise(resolve => {
    const body = JSON.stringify({ command });
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: '/command',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 800
    }, res => {
      res.resume();
      resolve((res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.end(body);
  });
}

class CommandAction extends SingletonAction {
  constructor(private readonly command: VoxCommand) { super(); }
  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    if (!(await sendCommand(this.command))) await ev.action.showAlert();
  }
}

class JogAction extends SingletonAction {
  private timer?: NodeJS.Timeout;
  constructor(private readonly command: VoxCommand) { super(); }
  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    if (!(await sendCommand(this.command))) {
      await ev.action.showAlert();
      return;
    }
    this.stopRepeat();
    this.timer = setInterval(() => { void sendCommand(this.command); }, 110);
  }
  override onKeyUp(_ev: KeyUpEvent): void { this.stopRepeat(); }
  private stopRepeat(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}

@action({ UUID: 'com.berniemack.voxbernie.record' }) class RecordAction extends CommandAction { constructor(){ super('record'); } }
@action({ UUID: 'com.berniemack.voxbernie.stop' }) class StopAction extends CommandAction { constructor(){ super('stop'); } }
@action({ UUID: 'com.berniemack.voxbernie.play' }) class PlayAction extends CommandAction { constructor(){ super('play'); } }
@action({ UUID: 'com.berniemack.voxbernie.jog-slow-left' }) class JogSlowLeftAction extends JogAction { constructor(){ super('jog-slow-left'); } }
@action({ UUID: 'com.berniemack.voxbernie.jog-slow-right' }) class JogSlowRightAction extends JogAction { constructor(){ super('jog-slow-right'); } }
@action({ UUID: 'com.berniemack.voxbernie.jog-fast-left' }) class JogFastLeftAction extends JogAction { constructor(){ super('jog-fast-left'); } }
@action({ UUID: 'com.berniemack.voxbernie.jog-fast-right' }) class JogFastRightAction extends JogAction { constructor(){ super('jog-fast-right'); } }
@action({ UUID: 'com.berniemack.voxbernie.cut' }) class CutAction extends CommandAction { constructor(){ super('cut'); } }
@action({ UUID: 'com.berniemack.voxbernie.copy' }) class CopyAction extends CommandAction { constructor(){ super('copy'); } }
@action({ UUID: 'com.berniemack.voxbernie.paste' }) class PasteAction extends CommandAction { constructor(){ super('paste'); } }
@action({ UUID: 'com.berniemack.voxbernie.delete' }) class DeleteAction extends CommandAction { constructor(){ super('delete'); } }
@action({ UUID: 'com.berniemack.voxbernie.undo' }) class UndoAction extends CommandAction { constructor(){ super('undo'); } }
@action({ UUID: 'com.berniemack.voxbernie.save' }) class SaveAction extends CommandAction { constructor(){ super('save'); } }
@action({ UUID: 'com.berniemack.voxbernie.save-as' }) class SaveAsAction extends CommandAction { constructor(){ super('save-as'); } }
@action({ UUID: 'com.berniemack.voxbernie.export' }) class ExportAction extends CommandAction { constructor(){ super('export'); } }

streamDeck.actions.registerAction(new RecordAction());
streamDeck.actions.registerAction(new StopAction());
streamDeck.actions.registerAction(new PlayAction());
streamDeck.actions.registerAction(new JogSlowLeftAction());
streamDeck.actions.registerAction(new JogSlowRightAction());
streamDeck.actions.registerAction(new JogFastLeftAction());
streamDeck.actions.registerAction(new JogFastRightAction());
streamDeck.actions.registerAction(new CutAction());
streamDeck.actions.registerAction(new CopyAction());
streamDeck.actions.registerAction(new PasteAction());
streamDeck.actions.registerAction(new DeleteAction());
streamDeck.actions.registerAction(new UndoAction());
streamDeck.actions.registerAction(new SaveAction());
streamDeck.actions.registerAction(new SaveAsAction());
streamDeck.actions.registerAction(new ExportAction());

streamDeck.connect();
