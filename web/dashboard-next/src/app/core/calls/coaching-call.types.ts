import type { ILocalVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng/esm';

export type CoachingParticipantRole = 'student' | 'expert';
export type ParticipantPresence = 'waiting' | 'joined' | 'reconnecting' | 'left';

export type ParticipantPresentation = {
  uid: number;
  role: CoachingParticipantRole;
  display_name: string;
  avatar?: string;
};

export type ParticipantTileState = {
  identity: ParticipantPresentation;
  presence: ParticipantPresence;
  audioEnabled: boolean;
  videoEnabled: boolean;
  videoTrack?: ILocalVideoTrack | IRemoteVideoTrack | null;
};

export type RemoteParticipantState = {
  uid: number;
  presence: ParticipantPresence;
  audioPublished: boolean;
  videoPublished: boolean;
  videoTrack: IRemoteVideoTrack | null;
};
