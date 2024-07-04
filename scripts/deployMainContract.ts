import { address, toNano } from '@ton/core';
import { MainContract } from '../wrappers/MainContract';
import { compile, NetworkProvider } from '@ton/blueprint';
import * as dotenv from 'dotenv';
dotenv.config();
const owner_address = process.env.OWNER_WALLET!;

export async function run(provider: NetworkProvider) {
    const mainContract = provider.open(
        MainContract.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
                owner: address(owner_address)

            },
            await compile('MainContract')
        )
    );

    await mainContract.sendDeploy(provider.sender(), toNano('0.01'));

    await provider.waitForDeploy(mainContract.address);

    console.log('ID', await mainContract.getID());
}
