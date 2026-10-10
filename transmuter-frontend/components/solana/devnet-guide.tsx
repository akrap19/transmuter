'use client'

import { useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import { FlaskConical } from 'lucide-react'
import { DevnetGuideBody } from '@/components/solana/devnet-guide-body'

export function DevnetGuideItem() {
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
			<Dialog.Trigger type='button' role='menuitem'>
				<FlaskConical size={14} /> Devnet instructions
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className='devnet-guide-backdrop' />
				<Dialog.Content className='devnet-guide'>
					<DevnetGuideBody />
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
