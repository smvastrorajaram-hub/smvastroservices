'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontend = fs.readFileSync(path.join(__dirname, '../public/smvastro.mjs'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, '../live-session-service.js'), 'utf8');

function blockBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, 'source block exists: ' + start);
  return source.slice(from, to);
}

test('Live Call negotiates a bidirectional WebRTC video track alongside existing audio', () => {
  assert.match(frontend, /addTransceiver\('video',\{direction:'sendrecv'\}\)/);
  assert.match(frontend, /smvLiveVideoSender=pc\.addTransceiver/);
  assert.match(frontend, /smvLiveLocalStream\.getAudioTracks\(\)\)pc\.addTrack/);
  assert.match(frontend, /remoteVideo\.srcObject=smvLiveRemoteStream/);
  assert.match(frontend, /remoteVideo\.muted=true/);
});

test('Live Call panel includes local preview, remote video, mute and camera controls', () => {
  for (const id of ['smvLiveVideoArea','smvLiveRemoteVideo','smvLiveLocalVideo','smvLiveCameraToggle','smvLiveSwitchCamera','smvLiveMute']) {
    assert.ok(frontend.includes(id), 'missing live media control: ' + id);
  }
  assert.match(frontend, /LIVE VIDEO CALL/);
  assert.match(frontend, /TURN CAMERA ON/);
  assert.match(frontend, /TURN CAMERA OFF/);
  assert.match(frontend, /SWITCH CAMERA/);
});

test('camera permission failure leaves the microphone call usable and allows camera retry', () => {
  assert.match(frontend, /Camera permission is blocked/);
  assert.match(frontend, /Microphone is ready\./);
  assert.match(frontend, /try\{await smvLiveEnableCamera\(\);\}catch\(cameraError\)/);
  assert.match(frontend, /return pc;/);
});

test('switching microphone preserves the active camera stream', () => {
  const mic = blockBetween(frontend, 'async function smvLiveSwitchAudioInput(', 'if(navigator.mediaDevices?.addEventListener');
  assert.match(mic, /oldStream\.removeTrack\(oldTrack\)/);
  assert.match(mic, /oldStream\.addTrack\(nextTrack\)/);
  assert.match(mic, /nextStream\.removeTrack\(nextTrack\)/);
  assert.doesNotMatch(mic, /smvLiveLocalStream=nextStream/);
});

test('turning camera off replaces only the negotiated video sender track', () => {
  const camera = blockBetween(frontend, 'async function smvLiveDisableCamera()', 'async function smvLiveToggleCamera()');
  assert.match(camera, /sender\.replaceTrack\(null\)/);
  assert.match(camera, /stream\.removeTrack\(track\)/);
  assert.match(camera, /track\.stop\(\)/);
});

test('ending or changing a session clears local and remote media devices', () => {
  const cleanup = blockBetween(frontend, 'function smvLiveCloseMedia(){', 'function smvLiveSessionEndedMessage(');
  assert.match(cleanup, /smvLiveRemoteVideo/);
  assert.match(cleanup, /smvLiveLocalVideo/);
  assert.match(cleanup, /smvLiveVideoSender=null/);
  assert.match(cleanup, /smvLiveLocalStream=null/);
});

test('video uses the existing authenticated WebRTC signal channel and leaves billing server-owned', () => {
  assert.match(service, /\['offer', 'answer', 'ice'\]/);
  assert.match(service, /MAX_SIGNAL_BYTES/);
  assert.match(service, /calculateLiveSessionCharge/);
  assert.match(service, /billableMinutesForElapsedMs/);
});
