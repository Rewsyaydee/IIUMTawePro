import type { Route } from "../types";

type RouteStepsListProps = {
  route: Route;
};

export function RouteStepsList({ route }: RouteStepsListProps) {
  return (
    <div className="route-steps">
      <ol className="route-steps-list">
        {route.steps.map((step, index) => (
          <li key={index} className="route-step-card">
            <span className="route-step-number">{index + 1}</span>
            <div>
              <p className="route-step-instruction">{step.instruction}</p>
              {step.landmark && <span className="route-step-landmark">{step.landmark}</span>}
              {step.note && <span className="route-step-note">{step.note}</span>}
            </div>
          </li>
        ))}
      </ol>
      {route.transitionNotes && (
        <div className="route-transition-notes">
          <p>{route.transitionNotes}</p>
        </div>
      )}
    </div>
  );
}
