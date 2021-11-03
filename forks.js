
/*
const fetchApi = (url, repo) => {
  const GITHUB_USERNAME = 'foo'
  const GITHUB_TOKEN = 'ghp_xxx'
  const apiUrl = 'https://api.github.com/repos/' + url.split('/').slice(3).join('/')
  console.log(apiUrl)
  const headers = new Headers()
  headers.set('Authorization', 'Basic ' + btoa(GITHUB_USERNAME + ":" + GITHUB_TOKEN))
  fetch(url, { headers: headers })
    .then(res => res.json())
    .then((data) => {
      console.log(data.stargazers_count)
      repo.insertAdjacentHTML('afterend', ` <span>(${data.stargazers_count} $ {svgStar})</span>`)
    })
}
*/

const isGithubNetworkPage = () => {
  if (window.location.href.startsWith('https://github.com/')) {
    return true
  }
  if (window.location.href.endsWith('network/members')) {
    return true
  }
  return false
}

const getBranchHtml = (branch) => {
  const behind = branch.match(/^This branch is (\d+) commits? behind/)
  if (behind) {
    const minus = parseInt(behind[1], 10)
    return {
      minus: minus,
      plus: 0,
      html: `<span style="color: red">-${minus}</span>`
    }
  }
  const ahead = branch.match(/This branch is (\d+) commits? ahead of/)
  if (ahead) {
    const plus = parseInt(ahead[1], 10)
    return {
      minus: 0,
      plus: plus,
      html: `<span style="color: green">+${plus}</span>`
    }
  }
  const behindAhead = branch.match(/^This branch is (\d+) commits? ahead, (\d+) commits? behind/)
  if (behindAhead) {
    const minus = parseInt(behindAhead[2], 10)
    const plus = parseInt(behindAhead[1], 10)
    return {
      minus: minus,
      plus: plus,
      html: `<span style="color: green">+${plus}</span> <span style="color: red">-${minus}</span>`
    }
  }
  return { minus: 0, plus: 0, html: '' }
}

const network = document.querySelector('.network')
const repos = isGithubNetworkPage() ? network.querySelectorAll('.repo') : []
const rootRepo = isGithubNetworkPage() ? network.querySelector('.repo') : []
/*
  richRepos - hash

  key:
    A incremented number representing the parent id

  value:
    A object containing two keys: stars and children
    The children are a array of the length 2.
    The first element is the stars and the second the child dom node
*/
const richRepos = {}
let finishSort = false
let numFetched = 0
let lastSort = null

const sortRepos = () => {
  network.innerHTML = ''
  network.insertAdjacentElement('beforeend', rootRepo)
  const sortedRepos = []
  Object.entries(richRepos).forEach(([parentId, val]) => {
    val.children.forEach((child) => {
      /* should be afterend imo but it does not work */
      val.parent.insertAdjacentElement('beforeend', child[1])
    })
    sortedRepos.push({
      stars: val.stars,
      branchMinus: val.branchMinus,
      branchPlus: val.branchPlus,
      parent: val.parent
    })
  })
  sortedRepos.sort((r1, r2) => {
    if (r2.stars === r1.stars) {
      return r2.branchPlus - r1.branchPlus
    }
    return r2.stars - r1.stars
  })
  sortedRepos.forEach((repo) => {
    network.insertAdjacentElement('beforeend', repo.parent)
  })
}

const checkSort = () => {
  if (!isGithubNetworkPage()) {
    return
  }
  if (finishSort) {
    return
  }
  if (lastSort === numFetched) {
    return
  }
  lastSort = numFetched
  // ignore root repo
  if (lastSort >= repos.length - 1) {
    finishSort = true
    sortRepos()
  }
}

setInterval(checkSort, 500)

const processRepo = (parentId, repo, isParent) => {
  const aNode = repo.querySelectorAll('a')[2]
  const url = aNode.href
  fetch(url)
    .then(data => data.text())
    .then((html) => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html');
      const branchDom = doc.querySelector('.d-sm-flex.Box > .d-flex')
      if (!branchDom) {
        return // the root repo
      }
      const stars = parseInt(doc.querySelectorAll('.social-count')[2].innerText, 10)
      const branch = branchDom.innerText.trim()
      const branchData = getBranchHtml(branch)
      // github style stars (looks ugly tho)
      /*
      const starsHtml = `
      <span style="border: 1px solid rgb(136, 136, 136);border-radius: 3px">
      <span style="background-color: rgb(247, 247, 247);border-right: 1px solid rgb(136, 136, 136);">
      ${svgStar}
      </span>
      <span>
      ${stars}
      </span>
      </span>
      `
      */
      const svgStar = `
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-star mr-1">
        <path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z"></path>
      </svg>
      `
      const starsHtml = `<span>(${stars} ${svgStar})</span>`
      aNode.insertAdjacentHTML('afterend', ` <span>${branchData.html} ${starsHtml}</span>`)
      // sortedRepos.push([parseInt(stars, 10), repo])
      if (!richRepos[parentId]) {
        richRepos[parentId] = { stars: 0, children: [] }
      }
      if (isParent) {
        richRepos[parentId].stars = stars
        richRepos[parentId].branchMinus = branchData.minus
        richRepos[parentId].branchPlus = branchData.plus
        richRepos[parentId].parent = repo
      } else {
        richRepos[parentId].children.push([stars, repo])
      }
      numFetched++
    })
}

const renderForkInfo = () => {
  if (!isGithubNetworkPage()) {
    return
  }
  let repoFamily = []
  const repoFamilys = []
  repos.forEach((repo) => {
    const nestLevel = repo.querySelectorAll('svg').length
    if (nestLevel === 1) {
      repoFamilys.push(repoFamily)
      repoFamily = []
    }
    repoFamily.push(repo)
  })
  repoFamilys.push(repoFamily)
  let parentId = 0
  repoFamilys.forEach((family) => {
    parentId++
    processRepo(parentId, family[0], true)
    family.slice(1).forEach((repo) => {
      processRepo(parentId, repo, false)
    })
  })
}

renderForkInfo()
