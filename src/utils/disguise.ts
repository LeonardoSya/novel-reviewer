// Fake file paths and timestamps to make the reader look like a code review tool

const FAKE_DIRS = [
  'src/services',
  'src/controllers',
  'src/middleware',
  'src/utils',
  'src/handlers',
  'lib/core',
  'lib/auth',
  'pkg/api',
  'internal/service',
  'app/modules',
];

const FAKE_FILES = [
  'auth-handler',
  'session-manager',
  'rate-limiter',
  'cache-service',
  'token-validator',
  'user-controller',
  'permission-guard',
  'data-transformer',
  'event-dispatcher',
  'query-builder',
  'config-loader',
  'health-check',
  'logger-factory',
  'error-handler',
  'request-parser',
];

const FAKE_EXTENSIONS = ['.ts', '.go', '.rs', '.py', '.java'];

export function generateFakeFilePath(chapterIndex: number): string {
  const dir = FAKE_DIRS[chapterIndex % FAKE_DIRS.length]!;
  const file = FAKE_FILES[chapterIndex % FAKE_FILES.length]!;
  const ext = FAKE_EXTENSIONS[Math.floor(chapterIndex / FAKE_FILES.length) % FAKE_EXTENSIONS.length]!;
  return `${dir}/${file}${ext}`;
}

export function generateFakeTimestamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
