'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { docsNavGroups } from '@/app/docs/docs-nav-data'

function DocsNavLinks({ onNavigate }: { onNavigate?: () => void }) {
	return (
		<>
			{docsNavGroups.map(group => (
				<div key={group.label}>
					<div className='side-label'>{group.label}</div>
					{group.links.map(link => (
						<a key={link.href} href={link.href} onClick={onNavigate}>
							{link.label}
						</a>
					))}
				</div>
			))}
		</>
	)
}

export function DocsMobileNav() {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open) return

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false)
		}

		document.addEventListener('keydown', onKeyDown)
		document.body.style.overflow = 'hidden'

		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.body.style.overflow = ''
		}
	}, [open])

	return (
		<>
			<div className='docs-mobile-nav'>
				<button
					type='button'
					className='docs-nav-toggle'
					aria-expanded={open}
					aria-controls='docs-nav-drawer'
					onClick={() => setOpen(current => !current)}
				>
					<Menu size={18} />
					<span className='docs-nav-toggle-label'>Docs navigation</span>
				</button>
			</div>

			<button
				type='button'
				className={cn('nav-drawer-backdrop docs-drawer-backdrop', open && 'is-open')}
				aria-label='Close documentation menu'
				tabIndex={open ? 0 : -1}
				onClick={() => setOpen(false)}
			/>
			<aside id='docs-nav-drawer' className={cn('docs-drawer nav-drawer', open && 'is-open')} aria-hidden={!open}>
				<button type='button' className='nav-drawer-close' aria-label='Close documentation menu' onClick={() => setOpen(false)}>
					<X size={20} />
				</button>
				<nav className='docs-drawer-nav'>
					<DocsNavLinks onNavigate={() => setOpen(false)} />
				</nav>
			</aside>
		</>
	)
}
