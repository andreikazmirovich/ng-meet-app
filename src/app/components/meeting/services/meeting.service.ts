import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import Peer from 'peerjs';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {

  private peer: Peer;
  private mediaConnection: Peer.MediaConnection;
  private dataConnection: Peer.DataConnection;

  public remoteStream$ = new BehaviorSubject<MediaStream | null>(null);
  public localStream$ = new BehaviorSubject<MediaStream | null>(null);
  public messages$ = new BehaviorSubject<string | null>(null);

  public initPeer(): string | null {
    const peerJsOptions: Peer.PeerJSOption = {
      debug: 3,
      config: {
        iceServers: [{
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302'
          ]
        }]
      }
    };

    try {
      const id = uuidv4();
      this.peer = new Peer(id, peerJsOptions);
      return id;
    }
    catch (error) {
      console.error(error);
      return null;
    }
  }

  public async hostMeeting(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      this.localStream$.next(stream);
      this.peer.on('call', (call: Peer.MediaConnection) => {
        this.mediaConnection = call;

        this.mediaConnection.answer(stream);

        this.mediaConnection.on('stream', (remoteStream: MediaStream) => {
          this.remoteStream$.next(remoteStream);
        });

        this.mediaConnection.on('error', (error: Error) => {
          console.error(error);
        });

        this.mediaConnection.on('close', () => this.onConnectionClose());
      });
    }
    catch (error) {
      console.error(error);
    }
  }

  public async joinMeeting(remotePeerId: string): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.dataConnection = this.dataConnection || this.peer.connect(remotePeerId);

      this.dataConnection.on('error', (error: Error) => {
        console.error(error);
      });

      this.mediaConnection = this.peer.call(remotePeerId, stream);
      if (!this.mediaConnection) {
        throw new Error('Unable to connect to remote peer');
      }

      this.localStream$.next(stream);

      this.mediaConnection.on('stream', (remoteStreem: MediaStream) => {
        this.remoteStream$.next(remoteStreem);
      });

      this.mediaConnection.on('error', (error: Error) => {
        console.error(error);
      });

      this.mediaConnection.on('close', () => this.onConnectionClose());
    }
    catch (error) {
      console.error(error);
    }
  }

  public hostChat(): void {
    this.peer.on('connection', (conn: Peer.DataConnection) => {
      this.dataConnection = conn;

      this.dataConnection.on('open', () => console.log('Somebody connected!'));

      this.dataConnection.on('data', (message: string) => {
        this.messages$.next(message);
      });
    });
  }

  public joinChat(remotePeerId: string): void {
    this.dataConnection = this.dataConnection || this.peer.connect(remotePeerId);

    this.dataConnection.on('error', (error: Error) => {
      console.error(error);
    });

    this.dataConnection.on('open', () => {
      this.dataConnection.on('data', (message: string) => {
        this.messages$.next(message);
      });
    });

  }

  public sendMessage(text: string): void {
    this.dataConnection.send(text);
  }

  public closeMediaConnection(): void {
    this.mediaConnection?.close();
    if (!this.mediaConnection) {
      this.onConnectionClose();
    }
  }

  public destroyPeer() {
    this.mediaConnection?.close();
    this.peer?.disconnect();
    this.peer?.destroy();
  }

  private onConnectionClose(): void {
    this.remoteStream$?.value?.getTracks().forEach(track => {
      track.stop();
    });
    this.localStream$?.value?.getTracks().forEach(track => {
      track.stop();
    });
  }
}
