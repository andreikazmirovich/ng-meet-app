import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { filter } from 'rxjs';

import { MeetingService } from './services/meeting.service';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.scss']
})
export class MeetingComponent implements OnInit, OnDestroy {

  @ViewChild('remoteVideo') private remoteVideo: ElementRef<HTMLVideoElement>;
  @ViewChild('localVideo') private localVideo: ElementRef<HTMLVideoElement>;

  private peerId: string | null;

  constructor(
    private meetingService: MeetingService
  ) {
    this.peerId = this.meetingService.initPeer();
    console.log(this.peerId);
  }

  ngOnInit(): void {
    this.meetingService.localStream$
      .pipe(filter(res => !!res))
      .subscribe(streem => this.localVideo.nativeElement.srcObject = streem);
    this.meetingService.remoteStream$
      .pipe(filter(res => !!res))
      .subscribe(streem => this.remoteVideo.nativeElement.srcObject = streem);
    this.meetingService.messages$
      .pipe(filter(res => !!res))
      .subscribe(message => console.log(message));
  }

  public ngOnDestroy(): void {
    this.meetingService.destroyPeer();
  }

  public startCall(): void {
    this.meetingService.hostMeeting();
    this.meetingService.hostChat();
  }

  public async joinCall(peerId: string): Promise<void> {
    await this.meetingService.joinMeeting(peerId);
    this.meetingService.joinChat(peerId);
  }

  public endCall(): void {
    this.meetingService.closeMediaConnection();
  }

  public sendMessage(text: string): void {
    this.meetingService.sendMessage(text);
  }
}
