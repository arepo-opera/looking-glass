// Alias: /api/research.json → same handler as /api/research. Both paths
// resolve so the .json variant works for tools that infer content type
// from the URL extension.
export { GET, revalidate } from "../research/route";
