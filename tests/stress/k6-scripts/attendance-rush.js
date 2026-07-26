// Scenario 3: Attendance Check-In Rush - students checking in with REAL JWTs
// Simulates 300 students arriving at an event and checking in at the same time
// Endpoint: POST /api/rpc (attendance.submit — auth required)
// Uses pre-generated student JWTs from students.json

import { check, sleep } from "k6";
import http from "k6/http";
import {
  THRESHOLDS, presetConfig, rpcCall, randomEventId,
  loadStudentTokens, getStudentHeaders, getStudentUserId
} from "./setup.js";

export const options = {
  ...presetConfig([
    { duration: "15s", target: 50 },
    { duration: "30s", target: 300 },
    { duration: "30s", target: 300 },
    { duration: "10s", target: 0 },
  ]),
  stages: [
    { duration: "15s", target: 50 },
    { duration: "30s", target: 300 },
    { duration: "30s", target: 300 },
    { duration: "10s", target: 0 },
  ]
};

const LOCATIONS = [
  { lat: 3.2511, lng: 101.7335 },
  { lat: 3.2516, lng: 101.7340 },
  { lat: 3.2520, lng: 101.7330 },
  { lat: 3.2505, lng: 101.7338 },
  { lat: 3.2513, lng: 101.7342 },
  { lat: 3.2518, lng: 101.7336 },
  { lat: 3.2522, lng: 101.7344 },
  { lat: 3.2508, lng: 101.7332 },
  { lat: 3.2515, lng: 101.7346 },
  { lat: 3.2524, lng: 101.7334 },
  { lat: 3.2510, lng: 101.7348 },
  { lat: 3.2519, lng: 101.7338 },
];

function randomLocation() {
  return LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
}

export function setup() {
  loadStudentTokens();
}

export default function () {
  const idx = __VU * 10000 + __ITER;
  const userId = getStudentUserId(idx);
  const eventId = randomEventId();
  const loc = randomLocation();
  const headers = getStudentHeaders(idx);

  const req = rpcCall("attendance.submit", {
    scheduleItemId: eventId,
    eventTitle: `Test Event ${eventId}`,
    studentName: `Student #${idx}`,
    matricNumber: `${2000000 + (idx % 4500)}`,
    latitude: loc.lat,
    longitude: loc.lng,
    status: "present"
  }, headers);

  const res = http.post(req.url, req.body, { headers: req.headers, tags: { name: "attendance.submit" } });

  check(res, {
    "attendance: status 200-201": (r) => r.status === 201,
    "attendance: response time < 2s": (r) => r.timings.duration < 2000,
  });

  sleep(0.5 + Math.random() * 1.5);
}
