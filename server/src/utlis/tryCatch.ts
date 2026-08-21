type Result<T, E = Error> = 
  | { data: T; error: null }
  | { data: null; error: E };

export async function tryCatch<T, E = Error>
(
  fn: () => Promise<T>
): Promise<Result<T, E>> 
 {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as E };
  }
}