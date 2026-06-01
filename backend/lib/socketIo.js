/** Shared Socket.io instance (set from server.js). */
let ioInstance = null

export function setIo(io) {
  ioInstance = io
}

export function getIo() {
  return ioInstance
}
