import express from 'express'
import path from 'node:path'
export function registerFrontend(app, directory) {
  const root = path.resolve(directory)
  // Preserve API and article 404s instead of returning the React application.
  app.use(['/api', '/insights'], (_req,res) => res.status(404).json({message:'Not found.'}))
  app.use(express.static(root, {dotfiles:'deny',index:false}))
  app.get(/.*/, (req,res,next) => {
    if(path.extname(req.path) || req.path.split('/').some(part=>part.startsWith('.'))) return res.sendStatus(404)
    res.set('Cache-Control','no-cache')
    res.sendFile('index.html',{root},next)
  })
}
