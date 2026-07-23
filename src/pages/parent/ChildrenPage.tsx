import { useNavigate } from 'react-router-dom';

import { useChildContext } from '../../context/child-context';
import { useTermContext } from '../../context/term-context';
import { formatGrade } from '../../lib/format';
import { paths } from '../../routes/paths';
import { Avatar, Chip, gradeTone } from '../../ui';
import { ChildRequired } from './ChildRequired';

export default function ChildrenPage() {
  const { children, childId, selectChild } = useChildContext();
  const { term } = useTermContext();
  const navigate = useNavigate();

  return (
    <main className="parent__body">
      <header className="parent__topbar">
        <div>
          <p className="parent__name">Mes enfants</p>
          <p className="parent__greeting">
            {term ? `Moyennes du ${term.label.toLowerCase()}` : 'Sélectionnez un enfant'}
          </p>
        </div>
      </header>

      <ChildRequired>
        <div className="parent__cards">
          {children.map((child) => {
            const selected = child.id === childId;
            return (
              <button
                key={child.id}
                type="button"
                className="ui-card ui-card--interactive parent__row"
                aria-current={selected}
                style={
                  selected
                    ? {
                        borderColor: 'var(--primary-container)',
                        background: 'var(--surface-container-low)',
                      }
                    : undefined
                }
                onClick={() => {
                  selectChild(child.id);
                  navigate(paths.parent.home);
                }}
              >
                <Avatar name={`${child.firstName} ${child.lastName}`} size={48} brand />
                <span className="parent__row-body">
                  <span className="parent__row-title">
                    {child.firstName} {child.lastName}
                  </span>
                  <span className="parent__row-meta">{child.classe.name}</span>
                </span>
                <Chip tone={gradeTone(child.average)}>{formatGrade(child.average)}</Chip>
              </button>
            );
          })}
        </div>
      </ChildRequired>
    </main>
  );
}
