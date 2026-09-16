import { docsNavGroups } from '@/app/docs/docs-nav-data'

export function DocsSidebar() {
	return (
		<aside className='docs-sidebar'>
			{docsNavGroups.map(group => (
				<div key={group.label}>
					<div className='side-label'>{group.label}</div>
					{group.links.map(link => (
						<a key={link.href} href={link.href}>
							{link.label}
						</a>
					))}
				</div>
			))}
		</aside>
	)
}
