import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const contractsRoot = join(frontendRoot, '..', 'smart contracts')

const programs = [
	'transmuter_factory',
	'transmuter_ctoken',
	'transmuter_eol_token',
	'transmuter_vesting',
	'transmuter_runway_escrow',
	'transmuter_staking',
	'transmuter_registry',
	'transmuter_dao'
]

const idlDir = join(frontendRoot, 'lib/solana/idl')
const typesDir = join(frontendRoot, 'lib/solana/types')

mkdirSync(idlDir, { recursive: true })
mkdirSync(typesDir, { recursive: true })

for (const name of programs) {
	copyFileSync(join(contractsRoot, 'target/idl', `${name}.json`), join(idlDir, `${name}.json`))
	copyFileSync(join(contractsRoot, 'target/types', `${name}.ts`), join(typesDir, `${name}.ts`))
	console.log(`copied ${name}`)
}
