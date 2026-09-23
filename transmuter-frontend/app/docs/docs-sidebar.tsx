import { docsNavGroups } from "@/app/docs/docs-nav-data";

export function DocsSidebar() {
  return (
    <nav className="docs-sidebar" aria-label="Docs sidebar">
      {docsNavGroups.map((group) => (
        <div key={group.label}>
          <h3>{group.label}</h3>
          <ul>
            {group.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
