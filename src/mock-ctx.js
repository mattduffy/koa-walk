const root = process.cwd()
console.log(root)

export const ctx = {
  request: {
    origin: 'https://walk.genevalakepiers.com',
  },
  app: {
    dirs: {
      archive: {
        archive: `${root}/archive`,
      },
      public: {
        dir: `${root}/public`,
        accounts: `${root}/public/a`,
        css: `${root}/public/c`,
        images: `${root}/public/i`,
        scripts: `${root}/public/j`,
      },
      private: {
        dir: `${root}/private`,
        accounts: `${root}/private/a`,
      },
    },
  },
}
