'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { externalLinks, isActivePath, routes, teamEmail, type RoutePath } from '@/lib/routes'
import { WalletButton } from '@/components/solana/wallet-button'
import { LogoMark } from '@/components/transmuter/logo-mark'
import { Wrap } from '@/components/transmuter/wrap'

type NavLink = {
	label: string
	href: RoutePath | string
	external?: boolean
}

const navLinks: NavLink[] = [
	{ label: 'Explore', href: routes.coins },
	{ label: 'Launchpad', href: routes.launchpad },
	{ label: 'My Coins', href: routes.myCoins },
	{ label: 'Portfolio', href: routes.portfolio },
	{ label: 'Docs', href: routes.docs }
]

const footerLinks = [
	{ label: 'Home', href: routes.home },
	{ label: 'Explore', href: routes.coins },
	{ label: 'Launchpad', href: routes.launchpad },
	{ label: 'My Coins', href: routes.myCoins },
	{ label: 'Portfolio', href: routes.portfolio },
	{ label: 'Docs', href: routes.docs },
	{ label: 'Contact', href: routes.contact }
] as const

function useNavDrawer() {
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

	return {
		open,
		toggle: () => setOpen(current => !current),
		close: () => setOpen(false)
	}
}

type NavDrawerProps = {
	open: boolean
	onClose: () => void
	pathname: string
	variant?: 'marketing' | 'launchpad'
}

function NavDrawer({ open, onClose, pathname, variant = 'marketing' }: NavDrawerProps) {
	return (
		<>
			<button
				type='button'
				className={cn('nav-drawer-backdrop', open && 'is-open')}
				aria-label='Close menu'
				tabIndex={open ? 0 : -1}
				onClick={onClose}
			/>
			<aside id='site-nav-drawer' className={cn('nav-drawer', open && 'is-open')} aria-hidden={!open}>
				<button type='button' className='nav-drawer-close' aria-label='Close menu' onClick={onClose}>
					<X size={20} />
				</button>
				<nav className='nav-drawer-links'>
					{navLinks.map(link => (
						<Link
							key={link.label}
							href={link.href}
							className={cn(isActivePath(pathname, link.href) && 'active', variant === 'launchpad' && 'launchpad-link')}
							onClick={onClose}
						>
							{link.label}
						</Link>
					))}
					<WalletButton className='nav-drawer-cta' />
				</nav>
			</aside>
		</>
	)
}

function NavToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
	return (
		<button
			type='button'
			className='nav-toggle'
			aria-expanded={open}
			aria-controls='site-nav-drawer'
			aria-label={open ? 'Close menu' : 'Open menu'}
			onClick={onToggle}
		>
			{open ? <X size={22} /> : <Menu size={22} />}
		</button>
	)
}

type SiteNavProps = {
	className?: string
}

export function SiteNav({ className }: SiteNavProps) {
	const pathname = usePathname()
	const { open, toggle, close } = useNavDrawer()

	return (
		<>
			<nav className={cn('site-nav', className)}>
				<Wrap className='nav-in'>
					<Link href={routes.home} className='wordmark'>
						<LogoMark className='wordmark-logo' />
						<span className='wordmark-text'>TRANSMUTER</span>
					</Link>
					<div className='nav-links nav-links--desktop'>
						{navLinks.map(link => (
							<Link key={link.label} href={link.href} className={cn(isActivePath(pathname, link.href) && 'active')}>
								{link.label}
							</Link>
						))}
					</div>
					<div className='nav-end'>
						<WalletButton />
						<NavToggle open={open} onToggle={toggle} />
					</div>
				</Wrap>
			</nav>
			<NavDrawer open={open} onClose={close} pathname={pathname} />
		</>
	)
}

export function LaunchpadNav() {
	const pathname = usePathname()
	const { open, toggle, close } = useNavDrawer()

	return (
		<>
			<nav className='launchpad-nav'>
				<Link className='nav-logo' href={routes.home}>
					<LogoMark className='wordmark-logo' size={24} />
					<span className='wordmark-text'>TRANSMUTER</span>
				</Link>
					<div className='nav-links nav-links--desktop'>
					{navLinks.map(link => (
						<Link key={link.label} href={link.href} className={cn(isActivePath(pathname, link.href) && 'active')}>
							{link.label}
						</Link>
					))}
				</div>
				<div className='nav-end'>
					<WalletButton />
					<NavToggle open={open} onToggle={toggle} />
				</div>
			</nav>
			<NavDrawer open={open} onClose={close} pathname={pathname} variant='launchpad' />
		</>
	)
}

export function SiteFooter() {
	return (
		<footer>
			<Wrap className='foot'>
				<div className='foot-main'>
					<div className='foot-brand'>&copy; 2026 The Midas Initiative · TRANSMUTER</div>
					<div className='links'>
						{footerLinks.map(link => (
							<Link key={link.label} href={link.href}>
								{link.label}
							</Link>
						))}
						<a href={externalLinks.twitter} target='_blank' rel='noopener'>
							@TransmuterTMI
						</a>
						<a href={externalLinks.email}>{teamEmail}</a>
					</div>
				</div>
				<div className='foot-credit'>
					<span>created by</span>
					<a href={externalLinks.studio19} target='_blank' rel='noopener' className='studio19-link'>
						<Image
							src='/studio19-logo.png'
							alt='Studio 19'
							width={108}
							height={28}
							className='studio19-logo'
						/>
					</a>
				</div>
			</Wrap>
		</footer>
	)
}
