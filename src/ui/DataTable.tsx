import type { ReactNode } from 'react';
import { Card } from './Card';
import { Skeleton } from './States';

export type Column<T> = {
  key: string;
  header?: ReactNode;
  /**
   * En-tête réservé aux lecteurs d'écran, pour les colonnes sans libellé
   * visible (celle des boutons d'action). Un `<th>` vide laisse la colonne sans
   * nature restituée — c'est la violation `empty-table-header` relevée par
   * l'audit sur tous les tableaux de gestion.
   */
  srHeader?: string;
  /** Alignement de la colonne ; `numeric` applique aussi des chiffres tabulaires. */
  align?: 'start' | 'center' | 'numeric';
  width?: number | string;
  render: (row: T, index: number) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** Affiche des lignes fantômes pendant le chargement. */
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  caption?: string;
};

function alignClass(align: Column<unknown>['align']) {
  if (align === 'numeric') return 'is-numeric';
  if (align === 'center') return 'is-center';
  return undefined;
}

export function DataTable<T>({
  columns, rows, rowKey, loading = false, skeletonRows = 6, empty, caption,
}: DataTableProps<T>) {
  const showEmpty = !loading && rows.length === 0;

  return (
    <Card>
      <div className="ui-table-wrap">
        <table className="ui-table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={alignClass(c.align)}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.srHeader ? <span className="sr-only">{c.srHeader}</span> : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={`sk-${i}`}>
                    {columns.map((c) => (
                      <td key={c.key} className={alignClass(c.align)}>
                        <Skeleton height={14} width={c.align === 'numeric' ? '40%' : '70%'} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, i) => (
                  <tr key={rowKey(row, i)}>
                    {columns.map((c) => (
                      <td key={c.key} className={alignClass(c.align)}>
                        {c.render(row, i)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {showEmpty ? empty : null}
    </Card>
  );
}
