/** Lightweight mobile atmosphere: soft blue light, no WebGL or image request. */
export default function GlassBackground() {
  return (
    <div className="auth-light-blobs" aria-hidden="true">
      <span className="auth-light-blob auth-light-blob-a" />
      <span className="auth-light-blob auth-light-blob-b" />
      <span className="auth-light-blob auth-light-blob-c" />
      <span className="auth-light-blob auth-light-blob-d" />
      <span className="auth-light-blob auth-light-blob-e" />
      <span className="auth-light-blob auth-light-blob-f" />
    </div>
  )
}
