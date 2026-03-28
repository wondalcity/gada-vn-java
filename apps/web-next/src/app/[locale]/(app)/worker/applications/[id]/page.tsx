interface Props { params: Promise<{ locale: string; id: string }> }

export default async function WorkerApplicationDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div>
      {/* TODO: implement WorkerApplicationDetailPage — screen-map.md B-06 */}
      {/* Application ID: {id} */}
      {/* DELETE /worker/applications/{id} to withdraw */}
    </div>
  )
}
