import { isActive, sessionRules } from './engine.mjs';
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function exactPattern(value) {
  const url = new URL(value);
  const host = escape(url.hostname).replace(
    /[a-z]/gi,
    (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`,
  );
  return (
    '^' +
    escape(url.protocol + '//') +
    host +
    '\\.?' +
    escape((url.port ? ':' + url.port : '') + url.pathname + url.search) +
    '(#.*)?$'
  );
}
export function buildRules(session, extensionURL, now = Date.now()) {
  if (!isActive(session, now)) return [];
  const redirect = {
    type: 'redirect',
    redirect: { regexSubstitution: extensionURL + 'blocked.html#\\0' },
  };
  let id = 1;
  const rule = (
    priority,
    action,
    regexFilter,
    isUrlFilterCaseSensitive = true,
  ) => ({
    id: id++,
    priority,
    action,
    condition: {
      regexFilter,
      resourceTypes: ['main_frame'],
      isUrlFilterCaseSensitive,
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
            ? exactPattern(r.value)
            : '^https?://' + escape(r.value) + '\\.?(:[0-9]+)?/',
          r.kind === 'url',
        ),
      );
    for (const grant of session.grants.filter((g) => g.until > now))
      rules.push(
        rule(
          2,
          { type: 'allow' },
          '^https?://' + escape(grant.domain) + '\\.?(:[0-9]+)?/',
          false,
        ),
      );
  }
  for (const domain of session.blocked ?? [])
    rules.push(
      rule(
        3,
        redirect,
        '^https?://([^/?#]*@)?([^/]+\\.)?' + escape(domain) + '\\.?(:[0-9]+)?/',
        false,
      ),
    );
  return rules;
}
