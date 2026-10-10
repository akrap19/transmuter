'use client'

import { useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import { CoinGuideBody } from '@/components/catalog/coin-guide-body'

export function CoinGuide() {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open) return
		const previous = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = previous
		}
	}, [open])

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger type='button' className='coin-guide-trigger'>
				How it works
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className='devnet-guide-backdrop' />
				<Dialog.Content className='devnet-guide'>
					<CoinGuideBody />
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
