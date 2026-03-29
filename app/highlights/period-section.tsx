import { Submission, Step } from "@/lib/types";
import SubmissionCard from "@/components/submission-card";

interface Props {
  title: string;
  submissions: Submission[];
  inProgress?: boolean;
  step?: Step;
}

function inProgressLabel(step?: Step): string {
  if (step === "daily") return "(today)";
  return "(ongoing)";
}

export default function PeriodSection({ title, submissions, inProgress, step }: Props) {
  // Weekly in-progress already says "- Present" in the label, so no extra annotation needed
  const showAnnotation = inProgress && step !== "weekly";

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b-2 border-orange-400 pb-1 mb-2">
        {title}
        {showAnnotation && (
          <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
            {inProgressLabel(step)}
          </span>
        )}
      </h2>
      {submissions.length === 0 ? (
        <p className="py-4 text-gray-400 text-sm">No data available</p>
      ) : (
        submissions.map((s, i) => (
          <SubmissionCard key={s.id} submission={s} rank={i + 1} />
        ))
      )}
    </section>
  );
}
