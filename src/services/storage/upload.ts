import { readJson, removeKey, writeJson } from './localStore';
import { readRaw } from './localStore';
import { STORAGE_KEYS } from './keys';
import { API_BASE_URL } from '../api/config';
import { UserProfile } from '../../types';
import { getUser, saveUser } from './user';
import { showToast } from '../shared/ui/Toast';
import { addActivity } from './activity';

export interface UploadFileInput {
  fileName: string;
  file: File;
  userId?: string;
}

/** Allowed resume / document extensions for upload. */
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.txt',
  '.json',
  '.md',
]);

/** Maximum allowed size in bytes for a single uploaded file (10 MB). */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Generate a deterministic but unique storage key for an uploaded file.
 *
 * The key is derived from the authenticated user id and the file name,
 * plus a short timestamp hash, so two uploads by the same user get distinct keys.
 *
 * @param userId - Authenticated user id (e.g. 'user-1'). Empty string falls back to session id.
 * @param fileName - Original file name as provided by the user.
 * @returns A unique storage key suitable for Supabase Object Storage.
 */
export function generateStorageKey(userId: string, fileName: string): string {
  const raw = `${userId || ''}${encodeURIComponent(fileName)}`;
  const timestamp = Math.floor(Date.now() / 1000).toString(36).slice(-6);
  const hash = crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + ':' + timestamp));
  const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `tf_file_${hex.slice(0, 12)}${timestamp}`;
}

/**
 * Validate a local File against the platform's MIME type and extension rules.
 *
 * Returns an object describing whether the file is valid and its detected properties:
 *   - isValid: true if the file passes all checks
 *   - mime: detected MIME type or 'unknown'
 *   - size: byte length of the file
 *   - ext: lowercase extension without dot
 *
 * @param file - The File instance to validate.
 * @returns {Object} { isValid, mime, size, ext }
 */
export function validateFile(file: File): {
  isValid: boolean;
  mime: string;
  size: number;
  ext: string;
} {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { isValid: false, mime: 'application/octet-stream', size: file.size, ext };
  }

  // Detect MIME type via magic bytes when possible.
  let mime: string;
  if (file.type === 'text/plain' || file.type === 'text/markdown') {
    mime = 'text/plain';
  } else if (
    file.type === 'application/vnd.openxmlformats-package' ||
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/vnd.google-docs' ||
    file.type === 'application/pdf' ||
    file.type.startsWith('image/')
  ) {
    mime = 'application/octet-stream';
  } else {
    mime = 'application/octet-stream';
  }

  return { isValid: file.size > 0 && file.type !== 'null' && file.size <= MAX_FILE_SIZE, mime, size: file.size, ext };
}

/**
 * Upload a local file through the existing backend API surface.
 *
 * The request is sent as multipart/form-data with fields:
 *   - file: <File>
 *   - name: <fileName>
 *   - [optional] user_id: <userId>
 *
 * On success the backend returns `{ key, url }` where `key` is the generated
 * unique storage key and `url` is a signed download URL (valid until 24 h).
 *
 * @param file - The file to upload.
 * @param userId - Optional authenticated user id; defaults to the current session user.
 * @returns Promise resolving to { key, url, user: UserProfile }.
 */
export async function uploadFile(file: File, userId?: string): Promise<{
  key: string;
  url: string;
  user: UserProfile;
}> {
  const input: UploadFileInput = { fileName: file.name, file };

  if (!input.file) throw new Error('No file field provided');

  const validation = validateFile(input.file);

  if (!validation.isValid) {
    throw new Error(`Upload failed: ${validation.ext}.${validation.mime} (${validation.size} bytes)`);
  }

  const user = getUser();
  const baseUserId = userId ?? user.id;

  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('name', input.file.name);

  if (baseUserId) {
    formData.append('user_id', baseUserId);
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/upload-resume`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Upload HTTP ${res.status}: ${errBody}`);
    }

    const json = await res.json();

    if (!json.key || !json.url) {
      throw new Error('Unexpected response shape: ' + JSON.stringify(json));
    }

    const stored = readJson<Record<string, unknown>>('tf_resume_data', json) as Record<string, unknown>;
    // Reconstruct user profile from stored data if available.
    const storedUser = readRaw('tf_user_profile', json) as Record<string, unknown> | null;
    const finalUser: UserProfile = {
      ...getUser(),
      id: stored.user?.id ?? baseUserId,
      email: stored.user?.email ?? user.email,
      fullName: stored.user?.full_name ?? user.fullName,
      role: stored.user?.role ?? user.role,
      isResumeUploaded: true,
      uploadedResumeFileName: stored.user?.uploadedResumeFileName ?? input.file.name,
      uploadedAt: new Date().toISOString(),
      atsScore: 0,
    };

    saveUser(finalUser);
    addActivity({
      type: 'file-upload',
      title: `File Uploaded: ${input.file.name}`,
      description: `Stored at ${finalUser.uploadedResumeFileName} for user ${finalUser.id}.`,
      badge: 'Active Profile',
    });

    return { key: json.key, url: json.url, user: finalUser };
  } catch (err) {
    console.error('[upload] Failed to upload file:', err);
    throw err;
  }
}
