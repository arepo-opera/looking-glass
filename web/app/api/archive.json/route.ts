// Alias: /api/archive.json → same handler as /api/archive. The .json
// path is the one named in llms.txt and the spec; the no-extension path
// is the conventional Next.js API route. Both work.
export { GET, revalidate, dynamic } from "../archive/route";
