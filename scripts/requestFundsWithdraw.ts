import { address, toNano } from '@ton/core';
import { MainContract } from '../wrappers/MainContract';
import { NetworkProvider, sleep } from '@ton/blueprint';
import * as dotenv from 'dotenv';
dotenv.config();
const contract_address = process.env.CONTRACT_ADDRESS!;
const owner_address = process.env.OWNER_WALLET!;

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    // const address = Address.parse(args.length > 0 ? args[0] : await ui.input('MainContract address'));

    // if (!(await provider.isContractDeployed(address))) {
    //     ui.write(`Error: Contract at address ${address} is not deployed!`);
    //     return;
    // }

    const mainContract = provider.open(
        MainContract.createFromAddress(address(contract_address))
    );

    // const counterBefore = await mainContract.getCounter();
    const balanceBefore = await mainContract.getContractBalance();

    await mainContract.sendWithdraw(provider.sender(), {
        value: toNano('0.01'),
        amount: toNano('0.015'),
        sender: address(owner_address)
    });

    ui.write('Waiting for contract to process withdrawal request...');

    let balanceAfter = await mainContract.getContractBalance();
    let attempt = 1;
    while (balanceAfter === balanceBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        balanceAfter = await mainContract.getContractBalance();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Funds withdrawn successfully!');
}
