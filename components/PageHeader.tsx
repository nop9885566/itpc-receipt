import type { ReactNode } from 'react';
import AppIcon, { type AppIconName } from './AppIcon';

export default function PageHeader(props: {
  title: string;
  description: string;
  section: string;
  icon: AppIconName;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <div className="page-eyebrow">{props.section}</div>
        <div className="page-title-row">
          <span className="page-icon"><AppIcon name={props.icon} size={22} /></span>
          <h1>{props.title}</h1>
        </div>
        <p>{props.description}</p>
      </div>
      {props.action && <div className="page-heading-action">{props.action}</div>}
    </div>
  );
}
