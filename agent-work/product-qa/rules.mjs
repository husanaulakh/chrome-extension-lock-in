import { isActive, sessionRules } from './engine.mjs';
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function buildRules(session, extensionURL, now = Date.now()) {
  if (!isActive(session, now)) return [];
  const redirect = {
    type: 'redirect',
    redirect: { regexSubstitution: extensionURL + 'blocked.html#\\0' },
  };
  let id = 1;
  const rule = (priority, action, regexFilter) => ({
    id: id++,
    priority,
    action,
    condition: {
      regexFilter,
      resourceTypes: ['main_frame'],
      isUrlFilterCaseSensitive: true,
    },
  });
  const rules = [];
  if (session.mode !== 'block') {
    rules.push(rule(1, redirect, '^https?://.*'));
    for (const r of sessionRules(session))
      rules.push(
        rule(
          2,
          { type: 'allow' },
          r.kind === 'url'
            ? '^' + escape(r.value.split('#')[0]) + '(#.*)?$'
            : '^https?://' + escape(r.value) + '(:[0-9]+)?/',
        ),
      );
    for (const grant of session.grants.filter((g) => g.until > now))
      rules.push(
        rule(
          2,
          { type: 'allow' },
          '^https?://' + escape(grant.domain) + '(:[0-9]+)?/',
        ),
      );
  }
  for (const domain of session.blocked ?? [])
    rules.push(
      rule(
        3,
        redirect,
        '^https?://([^/]+\\.)?' + escape(domain) + '(:[0-9]+)?/',
      ),
    );
  return rules;
}
