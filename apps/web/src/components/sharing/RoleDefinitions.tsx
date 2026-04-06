import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Shield, Check, X } from 'lucide-react';

export type ForestShareRole = 'viewer' | 'editor' | 'manager' | 'advisor';

interface Permission {
  key: string;
  label: string;
}

const PERMISSIONS: Permission[] = [
  { key: 'view_health', label: 'View forest health' },
  { key: 'view_financial', label: 'View financial data' },
  { key: 'view_operations', label: 'View operations' },
  { key: 'edit_parcels', label: 'Edit parcels' },
  { key: 'manage_surveys', label: 'Manage surveys' },
  { key: 'manage_sales', label: 'Manage sales' },
  { key: 'invite_others', label: 'Invite others' },
];

const ROLE_PERMISSIONS: Record<ForestShareRole, Record<string, boolean>> = {
  viewer: {
    view_health: true,
    view_financial: false,
    view_operations: false,
    edit_parcels: false,
    manage_surveys: false,
    manage_sales: false,
    invite_others: false,
  },
  editor: {
    view_health: true,
    view_financial: true,
    view_operations: true,
    edit_parcels: true,
    manage_surveys: false,
    manage_sales: false,
    invite_others: false,
  },
  manager: {
    view_health: true,
    view_financial: true,
    view_operations: true,
    edit_parcels: true,
    manage_surveys: true,
    manage_sales: true,
    invite_others: true,
  },
  advisor: {
    view_health: true,
    view_financial: true,
    view_operations: true,
    edit_parcels: false,
    manage_surveys: false,
    manage_sales: false,
    invite_others: false,
  },
};

const ROLE_DESCRIPTIONS: Record<ForestShareRole, string> = {
  viewer: 'Can see forest health data only',
  editor: 'Can view all data and edit parcels',
  manager: 'Full access including surveys, sales, and inviting others',
  advisor: 'Can view all data but cannot make changes',
};

const ROLE_COLORS: Record<ForestShareRole, string> = {
  viewer: 'text-blue-500',
  editor: 'text-[var(--amber)]',
  manager: 'text-[var(--green)]',
  advisor: 'text-purple-500',
};

export function getDefaultPermissions(role: ForestShareRole): Record<string, boolean> {
  return { ...ROLE_PERMISSIONS[role] };
}

interface RoleDefinitionsProps {
  compact?: boolean;
}

export function RoleDefinitions({ compact = false }: RoleDefinitionsProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!compact);

  const roles: ForestShareRole[] = ['viewer', 'editor', 'manager', 'advisor'];

  if (compact) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-[var(--text2)]">
            <Shield size={14} className="text-[var(--green)]" />
            {t('sharing.rolePermissions', 'Role permissions')}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text3)]" />
          )}
        </button>
        {expanded && <RoleTable roles={roles} />}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2 mb-4">
        <Shield size={16} className="text-[var(--green)]" />
        {t('sharing.rolePermissions', 'Role permissions')}
      </h3>
      <RoleTable roles={roles} />
    </div>
  );
}

function RoleTable({ roles }: { roles: ForestShareRole[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="pb-2 pr-4 text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider">
              Permission
            </th>
            {roles.map((role) => (
              <th
                key={role}
                className="pb-2 px-3 text-center"
              >
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${ROLE_COLORS[role]}`}>
                  {role}
                </span>
                <p className="text-[9px] text-[var(--text3)] font-normal mt-0.5 normal-case tracking-normal">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSIONS.map((perm) => (
            <tr key={perm.key} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2 pr-4 text-xs text-[var(--text2)]">
                {perm.label}
              </td>
              {roles.map((role) => (
                <td key={role} className="py-2 px-3 text-center">
                  {ROLE_PERMISSIONS[role][perm.key] ? (
                    <Check size={14} className="mx-auto text-[var(--green)]" />
                  ) : (
                    <X size={14} className="mx-auto text-[var(--text3)] opacity-30" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
