import 'mocha'
import * as assert from 'assert'
import {join as joinPath} from 'path'
import {AxiosInstance} from 'axios';
import {APIClient, APIError} from '@greymass/eosio'

import {AxiosProvider} from '../src'

suite('api', function () {
    this.slow(200)

    test('initialize', async function () {
        const api = new APIClient({
            provider: new AxiosProvider('https://jungle3.greymass.com')
        })
        assert.equal(api.provider instanceof AxiosProvider, true)
    })

    test('initialize multiple endpoints', async function () {
        const api = new APIClient({
            provider: new AxiosProvider([
                'https://jungle3.greymass.com',
                'https://jungle.eosn.io'
            ])
        })
        assert.equal(api.provider instanceof AxiosProvider, true)
    })

    test('clean - single endpoint', async function () {
        const provider = new AxiosProvider('https://jungle3.greymass.com/')
        assert.equal(provider.url, 'https://jungle3.greymass.com')
    })

    test('clean - multiple endpoints', async function () {
        const provider = new AxiosProvider([
            'https://eos.greymass.com/',
            'https://fio.greymass.com/',
            'https://jungle3.greymass.com/',
        ])
        assert.equal(provider.url, 'https://eos.greymass.com')
        assert.deepEqual(provider.getPool(), [
            'https://fio.greymass.com',
            'https://jungle3.greymass.com',
        ])
    })

    test('chain get_account', async function () {
        const api = new APIClient({
            provider: new AxiosProvider('https://jungle3.greymass.com')
        })
        const account = await api.v1.chain.get_account('eosio')
        assert.equal(account.account_name, 'eosio')
    })

    test('api error', async function () {
        try {
            const api = new APIClient({
                provider: new AxiosProvider('https://jungle3.greymass.com')
            })
            await api.call({path: '/v1/chain/get_account', params: {account_name: '.'}})
            assert.fail()
        } catch (error) {
            assert.equal(error instanceof APIError, true)
            assert.equal(error.message, 'Invalid name at /v1/chain/get_account')
            assert.equal(error.name, 'name_type_exception')
            assert.equal(error.code, 3010001)
            assert.deepEqual(error.details, [
                {
                    file: 'name.cpp',
                    line_number: 15,
                    message: 'Name not properly normalized (name: ., normalized: ) ',
                    method: 'set',
                },
            ])
        }
    })
})
