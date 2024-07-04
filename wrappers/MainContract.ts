import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
const crc32 = require("crc-32");

export type MainContractConfig = {
    id: number;
    counter: number;
    owner: Address;
    // sender: Address;
};

export function mainContractConfigToCell(config: MainContractConfig): Cell {
    return beginCell()
        .storeUint(config.id, 32)
        .storeUint(config.counter, 32)
        .storeAddress(config.owner)
        // .storeAddress(config.sender)
        .endCell();
}

export const Opcodes = {
    increase: crc32.str('op::increase'), // 0x7e8764ef,
    deposit: crc32.str('op::deposit') >>> 0, // should be unsigned integer
    withdraw: crc32.str('op::withdraw') >>>0
};

export class MainContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new MainContract(address);
    }

    static createFromConfig(config: MainContractConfig, code: Cell, workchain = 0) {
        const data = mainContractConfigToCell(config);
        const init = { code, data };
        return new MainContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendIncrease(
        provider: ContractProvider,
        via: Sender,
        opts: {
            increaseBy: number;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.increaseBy, 32)
                .endCell(),
        });
    }

    async sendDeposit(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.deposit, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .endCell(),
        });
    }

    async sendWithdraw(provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryID?: number;
            sender: Address;
            amount: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.withdraw, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.sender)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }

    async getCounter(provider: ContractProvider) {
        const result = await provider.get('get_counter', []);
        return result.stack.readNumber();
    }

    async getID(provider: ContractProvider) {
        const result = await provider.get('get_id', []);
        return result.stack.readNumber();
    }

    async getOwnerAddress(provider: ContractProvider) {
        const result = await provider.get('get_owner', []);
        return result.stack.readAddress();
    }

    async getContractBalance(provider: ContractProvider){
        const result = await provider.get('get_contract_balance', []);
        return result.stack.readBigNumber();
    }
}
