import test from 'node:test'
import assert from 'node:assert/strict'
import { readiness, automationValue } from '../client/src/lib/experience.ts'
test('readiness extremes, bands and weakest-dimension priorities', () => {
  assert.equal(readiness([0,0,0,0,0]).score, 0)
  assert.equal(readiness([3,3,3,3,3]).score, 100)
  assert.equal(readiness([1,1,1,1,1]).stage, 'Build the foundations')
  assert.equal(readiness([2,1,1,1,1]).stage, 'Prepare to scale')
  assert.equal(readiness([3,3,3,2,1]).stage, 'Scale with discipline')
  assert.equal(readiness([3,3,3,3,0]).priorities.length, 1)
})
test('readiness rejects incomplete and invalid answers', () => {
  for (const input of [[], [0,0], [3,3,3,3,4], [0,0,0,0,NaN], [1,1,1,1,-1]]) assert.throws(() => readiness(input))
})
test('capacity calculation includes adoption and ongoing cost', () => {
  const r = automationValue(400,1200,50,75,600000,15000)
  assert.equal(r.released,150)
  assert.equal(r.annual,2160000)
  assert.equal(r.net,1980000)
  assert.equal(r.payback,600000/165000)
})
test('zero adoption and uneconomic scenarios have no payback', () => {
  assert.equal(automationValue(400,1200,50,0,600000,15000).payback,null)
  assert.equal(automationValue(10,10,100,100,500,100).payback,null)
  assert.equal(automationValue(400,1200,50,75,0,0).payback,0)
})
test('invalid calculator assumptions are rejected', () => {
  assert.throws(() => automationValue(-1,10,50,50,0,0))
  assert.throws(() => automationValue(10,10,101,50,0,0))
  assert.throws(() => automationValue(10,NaN,50,50,0,0))
})
