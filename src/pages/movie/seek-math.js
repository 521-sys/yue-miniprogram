function seekTimeFromClientX(clientX, left, width, duration) {
  if (![clientX, left, width, duration].every(Number.isFinite) || width <= 0 || duration <= 0) {
    return null
  }
  const position = Math.max(0, Math.min(1, (clientX - left) / width))
  return position * duration
}

module.exports = { seekTimeFromClientX }
