/* Run an action that may go to the server: success toast when it worked,
   the server's message when it did not. Works for sync (demo) and async
   (API) actions alike. */
export async function act(toast, fn, ok) {
  try {
    const result = await fn();
    if (ok) toast.success(typeof ok === 'function' ? ok(result) : ok);
    return result ?? true;
  } catch (e) {
    toast.error(e?.message || 'That did not work. Try again.');
    return undefined;
  }
}
