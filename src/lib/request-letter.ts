export type RequestLetter = {
  id: string;
  title: string;
  description: string;
  date: string;
  times: string;
  venue: string;
  objectives?: string | null;
  department?: string | null;
  duration?: string | null;
  participants?: number | null;
  audience?: string | null;
  budget: string | null;
  requirements?: string | null;
  faculty: string;
  dean: string;
  facultySignedAt?: string | null;
  deanSignedAt?: string | null;
  createdAt?: string | null;
  letterId: string;
};

export function requestLetterFields(letter: RequestLetter) {
  return [
    ["Date & time", [letter.date, letter.times && `${letter.times} IST`].filter(Boolean).join(" · ")],
    ["Venue", letter.venue],
    ["Duration", letter.duration],
    ["Participants", [letter.participants?.toLocaleString("en-IN"), letter.audience].filter(Boolean).join(" · ")],
    ["Budget estimate", letter.budget],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}
