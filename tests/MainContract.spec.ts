import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { MainContract } from '../wrappers/MainContract';
import '@ton/test-utils';
import { flattenTransaction } from '@ton/test-utils';

import { compile } from '@ton/blueprint';

describe('MainContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('MainContract');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>; // OWNER
    let sender: SandboxContract<TreasuryContract>;
    let mainContract: SandboxContract<MainContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        sender = await blockchain.treasury('sender');

        mainContract = blockchain.openContract(
            MainContract.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                    owner: deployer.address,
                    // sender: sender.address
                },
                code
            )
        );


        const deployResult = await mainContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: mainContract.address,
            deploy: true,
            success: true,
        });
    });

    it('should get contract id after deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and mainContract are ready to use
        const contract_id = await mainContract.getID();
        expect(contract_id).toBe(0);
    });

    it('should get contract owner address after deploy', async () => {
        const ownerAddress = await mainContract.getOwnerAddress();
        expect(ownerAddress.toString()).toBe(deployer.address.toString());
    })

    it('should increase counter', async () => {
        const increaseTimes = 3;
        for (let i = 0; i < increaseTimes; i++) {
            // console.log(`increase ${i + 1}/${increaseTimes}`);

            const increaser = await blockchain.treasury('increaser' + i);

            const counterBefore = await mainContract.getCounter();

            // console.log('counter before increasing', counterBefore);

            const increaseBy = Math.floor(Math.random() * 100);

            // console.log('increasing by', increaseBy);

            const increaseResult = await mainContract.sendIncrease(increaser.getSender(), {
                increaseBy,
                value: toNano('0.05'),
            });

            expect(increaseResult.transactions).toHaveTransaction({
                from: increaser.address,
                to: mainContract.address,
                success: true,
            });

            const counterAfter = await mainContract.getCounter();

            // console.log('counter after increasing', counterAfter);

            expect(counterAfter).toBe(counterBefore + increaseBy);
        }
    }); 

    it ('should increase contract balance without increasing counter with op::deposit', async () => {
        const balanceBefore = await mainContract.getContractBalance();
        const counterBefore = await mainContract.getCounter();
        await mainContract.sendDeposit(sender.getSender(), {
            value: toNano('0.06'),
        });
        const balanceAfter = await mainContract.getContractBalance();
        const counterAfter = await mainContract.getCounter();
        // console.log('balance before and after ', toNano(balanceBefore), toNano(balanceAfter));
        expect(balanceAfter).toBeGreaterThan(balanceBefore + toNano('0.05'));
        expect(counterBefore).toBe(counterAfter);
    });

    it ('should withdraw funds on behalf of the owner', async () => {
        await mainContract.sendDeposit(sender.getSender(), {
            value: toNano('0.07'),
        });
        const withdrawalRequestResult = await mainContract.sendWithdraw(deployer.getSender(), {
            value: toNano('0.05'),
            sender: deployer.address,
            amount: toNano('0.06')
        });
        // const arr = withdrawalRequestResult.transactions.map(tx => flattenTransaction(tx));
        // console.log(arr);
        expect(withdrawalRequestResult.transactions).toHaveTransaction({
            from: mainContract.address,
            to: deployer.address,
            value: toNano('0.06'),
            success: true
        })
    });

    it ('should withdraw corrected amount of funds to preserve 0.01 ton in the balance', async () => {
        const balanceBefore = await mainContract.getContractBalance();
        // console.log('contract balance ', contract_balance);
        const requiredAmountToWithdraw = toNano('0.05')
        const withdrawalRequestResult = await mainContract.sendWithdraw(deployer.getSender(), {
            value: toNano('0.01'),
            sender: deployer.address,
            amount: requiredAmountToWithdraw
        });
        expect(withdrawalRequestResult.transactions).toHaveTransaction({
            from: mainContract.address,
            to: deployer.address,
            success: true
        });
        const balanceAfter = await mainContract.getContractBalance();
        const withdrawnAmount = balanceBefore - balanceAfter;
        // console.log('expectedWithdraw', expectedWithdraw);
        expect(withdrawnAmount).toBeLessThan(requiredAmountToWithdraw);
    });

    it ('fails to withdraw funds because of the balance lack', async () => {
        // const contract_balance = await mainContract.getContractBalance();
        await mainContract.sendDeposit(sender.getSender(), {
            value: toNano('1'),
        })
        // console.log('contract balance ', contract_balance);
        const withdrawaRequestlResult = await mainContract.sendWithdraw(deployer.getSender(), {
            value: toNano('0.01'),
            sender: deployer.address,
            amount: toNano('1.5')
        })
        expect(withdrawaRequestlResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: mainContract.address,
            success: false,
            exitCode: 104
        })
    });

    it ('fails to withdraw funds on behalf of the not-owner', async () => {
        const withdrawaRequestlResult = await mainContract.sendWithdraw(sender.getSender(), {
            value: toNano('0.01'),
            sender: sender.address,
            amount: toNano('0.5')
        })
        expect(withdrawaRequestlResult.transactions).toHaveTransaction({
            from: sender.address,
            to: mainContract.address,
            success: false,
            exitCode: 103
        })
    });

});
