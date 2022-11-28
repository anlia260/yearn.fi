import React, {Fragment, ReactElement, useMemo} from 'react';
import Image from 'next/image';
import {Popover, Transition} from '@headlessui/react';
import {useWeb3} from '@yearn-finance/web-lib/contexts';
import {AddToMetamask} from '@yearn-finance/web-lib/icons';
import IconCross from '@yearn-finance/web-lib/icons/IconCross';
import IconWallet from '@yearn-finance/web-lib/icons/IconWallet';
import {format, toAddress, truncateHex} from '@yearn-finance/web-lib/utils';
import {useWallet} from 'contexts/useWallet';
import {useYearn} from 'contexts/useYearn';
import {TYearnVault} from 'types/yearn';

import type {TBalanceData} from '@yearn-finance/web-lib/hooks/types';
import type {TAddress, TDict, TMetamaskInjectedProvider} from '@yearn-finance/web-lib/utils';

type TBalanceReminderElement = {
	address: TAddress,
	normalizedBalance: number,
	decimals: number,
	symbol: string,
}

export default function BalanceReminderPopover(): ReactElement {
	const	{balances, isLoading} = useWallet();
	const	{address, ens, isActive, provider, onDesactivate} = useWeb3();
	const	{vaults} = useYearn();

	async function addTokenToMetamask(address: string, symbol: string, decimals: number, image: string): Promise<void> {
		try {
			await (provider as TMetamaskInjectedProvider).send('wallet_watchAsset', {
				type: 'ERC20',
				options: {
					address,
					symbol,
					decimals,
					image
				}
			});
		} catch (error) {
			// Token has not been added to MetaMask.
		}
	}

	const	nonNullBalances = useMemo((): TDict<TBalanceData> => {
		const	nonNullBalances = Object.entries(balances).reduce((acc, [address, balance]): TDict<TBalanceData> => {
			if (!balance.raw.isZero()) {
				acc[toAddress(address)] = balance;
			}
			return acc;
		}, {} as TDict<TBalanceData>); // eslint-disable-line @typescript-eslint/consistent-type-assertions
		return nonNullBalances;
	}, [balances]);

	const	nonNullBalancesForVault = useMemo((): TBalanceReminderElement[] => {
		const	nonNullBalancesForVault = Object.entries(nonNullBalances).reduce((acc, [address, balance]): TBalanceReminderElement[] => {
			if (vaults[toAddress(address)]) {
				acc.push({
					address: toAddress(address),
					normalizedBalance: balance.normalized,
					decimals: balance.decimals,
					symbol: (vaults[toAddress(address)] as TYearnVault).symbol
				});
			}
			return acc;
		}, [] as TBalanceReminderElement[]); // eslint-disable-line @typescript-eslint/consistent-type-assertions
		return nonNullBalancesForVault;
	}, [nonNullBalances, vaults]);

	return (
		<Popover className={'relative flex'}>
			{(): ReactElement => (
				<>
					<Popover.Button>
						<IconWallet className={'yveCRV--nav-link mt-0.5 h-4 w-4'} />
					</Popover.Button>
					<Transition
						as={Fragment}
						enter={'transition ease-out duration-200'}
						enterFrom={'opacity-0 translate-y-1'}
						enterTo={'opacity-100 translate-y-0'}
						leave={'transition ease-in duration-150'}
						leaveFrom={'opacity-100 translate-y-0'}
						leaveTo={'opacity-0 translate-y-1'}
					>
						<Popover.Panel className={'absolute right-0 top-6 z-[1000] mt-3 w-screen max-w-xs md:top-4 md:-right-4 '}>
							<div className={'overflow-hidden'}>
								<div className={'relative bg-neutral-100 p-0'}>
									<div className={'flex items-center justify-center border-b border-neutral-300 py-4 text-center'}>
										<b>
											{isActive && address && ens ? (
												ens
											) : isActive && address ? (
												truncateHex(address, 5)
											) : 'Connect wallet'}
										</b>
									</div>
									<div className={'absolute top-4 right-4'}>
										<button
											onClick={onDesactivate}
											className={'flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200/50'}>
											<IconCross className={'h-4 w-4 text-neutral-600'} />
										</button>
									</div>

									{
										(nonNullBalancesForVault.length === 0 && isLoading) ? (
											<div className={'py-4 text-center text-sm text-neutral-400'}>
												{'Retrieving your yvTokens ...'}
											</div>
										) : (nonNullBalancesForVault.length === 0) ? (
											<div className={'py-4 text-center text-sm text-neutral-400'}>
												{'No position in Yearn found.'}
											</div>
										) : nonNullBalancesForVault.map((vault): ReactElement => (
											<a
												key={vault.address}
												href={`https://etherscan.io/address/${vault.address}`}
												target={'_blank'}
												rel={'noreferrer'}
												className={'flow-root cursor-alias p-2 transition-colors hover:bg-neutral-200 md:p-4'}>
												<span className={'flex flex-row items-center justify-between'}>
													<span className={'flex items-center text-neutral-900'}>
														<div className={'flex w-12'}>
															<Image
																alt={vault.symbol}
																width={32}
																height={32}
																quality={90}
																src={`${process.env.BASE_YEARN_ASSETS_URI}/1/${toAddress(vault.address)}/logo-128.png`} />
														</div>
														<span className={'ml-2'}>{vault.symbol}</span>
													</span>
													<span className={'flex flex-row items-center justify-center tabular-nums text-neutral-900'}>
														{format.amount(balances[toAddress(vault.address)]?.normalized || 0, 2, 4)}
														<AddToMetamask
															onClick={(e): void => {
																e.preventDefault();
																e.stopPropagation();
																addTokenToMetamask(
																	vault.address as string,
																	vault.symbol,
																	vault.decimals,
																	`${process.env.BASE_YEARN_ASSETS_URI}/1/${toAddress(vault.address)}/logo-128.png`
																);
															}}
															className={'ml-4 h-4 w-4 cursor-pointer text-neutral-400 transition-colors hover:text-neutral-900'} />
													</span>
												</span>
											</a>
										))
									}
								</div>
							</div>
						</Popover.Panel>
					</Transition>
				</>
			)}
		</Popover>
	);
}
